import { isSupabaseConfigured, supabase } from './supabase.js';
import { slotsOverlap, validateSlotInput } from './slot-validation.js';

const demoKey = 'ltp-v4-demo-state';

const demoState = {
  profile: {
    full_name: 'Mazen Chaban',
    email: 'mazen@example.com',
    phone: '+33 6 12 34 56 78',
    phone_verified: true,
    role: 'traveler'
  },
  hostProfile: {
    public_name: 'Claire',
    city: 'Aix-en-Provence',
    verified: true,
    premium: false
  }
};

function readDemo(){
  try { return {...demoState, ...JSON.parse(localStorage.getItem(demoKey) || '{}')}; }
  catch { return structuredClone(demoState); }
}

function writeDemo(next){
  localStorage.setItem(demoKey, JSON.stringify(next));
  return next;
}

async function currentUser(){
  if(!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if(error) throw error;
  return data.user;
}

async function loadAccount(role = 'traveler'){
  if(!supabase) return readDemo();
  const user = await currentUser();
  if(!user) return readDemo();
  const [{data: profile, error: profileError}, {data: hostProfile, error: hostError}, {data: preferences, error: preferencesError}, {data: notifications, error: notificationsError}] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    role === 'host' ? supabase.from('host_profiles').select('*').eq('user_id', user.id).maybeSingle() : Promise.resolve({data:null,error:null}),
    role === 'traveler' ? supabase.from('traveler_preferences').select('*').eq('user_id', user.id).maybeSingle() : Promise.resolve({data:null,error:null}),
    supabase.from('notification_preferences').select('*').eq('user_id', user.id).eq('context', role).maybeSingle()
  ]);
  if(profileError) throw profileError;
  if(hostError) throw hostError;
  if(preferencesError) throw preferencesError;
  if(notificationsError) throw notificationsError;
  return { profile: {...(profile || readDemo().profile), email:user.email}, hostProfile: hostProfile || readDemo().hostProfile, preferences, notifications };
}

async function saveAccount(role, payload){
  if(!supabase){
    const state = readDemo();
    const key = role === 'host' ? 'hostProfile' : 'profile';
    state[key] = {...state[key], ...payload};
    return writeDemo(state)[key];
  }
  const user = await currentUser();
  if(!user) throw new Error('Connectez-vous pour enregistrer ces réglages.');
  if(payload.email && payload.email !== user.email){
    const {error} = await supabase.auth.updateUser({email:payload.email});
    if(error) throw error;
  }
  const notificationData = {
    user_id:user.id,
    context:role,
    email_enabled:Boolean(payload.booking_notifications),
    sms_enabled:Boolean(payload.booking_notifications),
    push_enabled:Boolean(payload.message_notifications),
    marketing_enabled:Boolean(payload.marketing_notifications || payload.maz_notifications)
  };
  if(role === 'host'){
    const {error: profileError} = await supabase.from('profiles').update({phone:payload.phone, active_role:'host'}).eq('id',user.id);
    if(profileError) throw profileError;
    const {data, error} = await supabase.from('host_profiles').upsert({
      user_id:user.id,
      public_name:payload.public_name,
      city:payload.city,
      bio:payload.bio
    }).select().single();
    if(error) throw error;
    const {error: notificationError} = await supabase.from('notification_preferences').upsert(notificationData);
    if(notificationError) throw notificationError;
    return data;
  }
  const {error: profileError} = await supabase.from('profiles').update({full_name:payload.full_name,phone:payload.phone,active_role:'traveler'}).eq('id',user.id);
  if(profileError) throw profileError;
  const {error: preferenceError} = await supabase.from('traveler_preferences').upsert({
    user_id:user.id,
    adults:Number(payload.adults || 0),
    children:Number(payload.children || 0),
    babies:Number(payload.babies || 0),
    quiet_preference:Boolean(payload.quiet_preference),
    accessibility_needs:payload.accessible ? ['easy_access'] : []
  });
  if(preferenceError) throw preferenceError;
  const {error: notificationError} = await supabase.from('notification_preferences').upsert(notificationData);
  if(notificationError) throw notificationError;
  return payload;
}

async function requestPasswordReset(email){
  if(!supabase) throw new Error('La réinitialisation sécurisée nécessite une connexion au service d’authentification.');
  const targetEmail = email || (await currentUser())?.email;
  if(!targetEmail) throw new Error('Ajoutez une adresse e-mail valide à votre compte.');
  const {error} = await supabase.auth.resetPasswordForEmail(targetEmail, {redirectTo:location.origin + '/espace.html?view=account'});
  if(error) throw error;
  return true;
}

async function listHostReservations(){
  if(!supabase) return null;
  const user = await currentUser();
  if(!user) return null;
  const {data, error} = await supabase
    .from('reservations')
    .select('id,status,guest_count,total_amount,currency,notes,created_at,slot:availability_slots!inner(id,start_at,end_at,format,listing:listings!inner(id,title,host_id)),traveler:profiles!reservations_traveler_id_fkey(id,full_name,avatar_url)')
    .eq('slot.listing.host_id', user.id)
    .order('created_at', {ascending:false});
  if(error) throw error;
  return data;
}

async function markReservationReady(id){
  if(!supabase) return {id,status:'ready'};
  const {data, error} = await supabase.rpc('mark_reservation_ready', {reservation_id:id});
  if(error) throw error;
  return data;
}

async function listHostSlots(){
  if(!supabase) return readDemo().availabilitySlots || [];
  const user = await currentUser();
  if(!user) return [];
  const {data, error} = await supabase
    .from('availability_slots')
    .select('id,listing_id,format,start_at,end_at,price_amount,price_unit,capacity,status,listing:listings!inner(host_id)')
    .eq('listing.host_id', user.id)
    .gte('end_at', new Date().toISOString())
    .order('start_at');
  if(error) throw error;
  return data;
}

async function publishAvailabilitySlot(payload){
  const slot = validateSlotInput(payload);
  if(!supabase){
    const state = readDemo();
    const existing = state.availabilitySlots || [];
    if(slotsOverlap(slot, existing)) throw new Error('Ce créneau chevauche une disponibilité déjà enregistrée.');
    const created = {
      id:crypto.randomUUID(),listing_id:'demo-micocouliers',status:'open',
      format:slot.format,start_at:slot.startAt,end_at:slot.endAt,
      price_amount:slot.priceAmount,price_unit:slot.priceUnit,capacity:slot.capacity
    };
    state.availabilitySlots = [...existing, created];
    writeDemo(state);
    return created;
  }
  const user = await currentUser();
  if(!user) throw new Error('Connectez-vous pour publier un créneau.');
  let listingId = payload.listingId;
  if(!listingId){
    const {data:listing, error:listingError} = await supabase.from('listings').select('id').eq('host_id',user.id).order('created_at').limit(1).maybeSingle();
    if(listingError) throw listingError;
    if(!listing) throw new Error('Créez votre annonce avant d’ouvrir un créneau.');
    listingId = listing.id;
  }
  const {data, error} = await supabase.rpc('create_availability_slot', {
    target_listing:listingId,slot_format:slot.format,slot_start:slot.startAt,slot_end:slot.endAt,
    slot_price:slot.priceAmount,slot_price_unit:slot.priceUnit,slot_capacity:slot.capacity
  });
  if(error){
    if(error.message?.includes('slot_overlap')) throw new Error('Ce créneau chevauche une disponibilité déjà enregistrée.');
    throw error;
  }
  return data;
}

function subscribeToHost(hostId, handler){
  if(!supabase || !hostId) return () => {};
  const channel = supabase.channel(`host:${hostId}`, {config:{private:true}})
    .on('broadcast', {event:'reservation_changed'}, ({payload}) => handler(payload))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

window.LTPBackend = {
  configured: isSupabaseConfigured,
  supabase,
  loadAccount,
  saveAccount,
  requestPasswordReset,
  listHostReservations,
  listHostSlots,
  publishAvailabilitySlot,
  markReservationReady,
  subscribeToHost
};

window.dispatchEvent(new CustomEvent('ltp:backend-ready', {detail:{configured:isSupabaseConfigured}}));
