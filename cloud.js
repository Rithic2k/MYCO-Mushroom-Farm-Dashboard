/* MYCO private cloud adapter. Uses the public Supabase publishable/anon key only.
   Access to farm rows and photos is enforced by RLS in supabase_setup.sql. */
(function () {
  'use strict';
  const SETTINGS_KEY = 'myco-cloud-settings-v1';
  let client = null;
  let user = null;
  const publicKey = key => {
    if (key.startsWith('sb_publishable_')) return true;
    if (!key.startsWith('eyJ')) return false;
    try { const b64=key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');const payload=JSON.parse(atob(b64));return payload.role==='anon'; }
    catch (_) { return false; }
  };
  const getConfig = () => {
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (_) {}
    const fileConfig = window.MYCO_SUPABASE || {};
    return { url: (stored.url || fileConfig.url || '').trim(), key: (stored.key || fileConfig.publishableKey || '').trim() };
  };
  const configured = () => { const c = getConfig(); return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(c.url) && publicKey(c.key); };
  const check = () => { if (!client || !user) throw new Error('Sign in to Supabase first.'); };
  const result = (response) => { if (response.error) throw new Error(response.error.message || String(response.error)); return response.data; };
  window.MYCOCloud = {
    getConfig, configured,
    saveConfig(url, key) {
      if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(url).trim())) throw new Error('Enter your Supabase Project URL (https://xxx.supabase.co).');
      if (!publicKey(String(key).trim())) throw new Error('Enter a publishable key or legacy anon-role key. Secret and service_role keys are forbidden.');
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({url:String(url).trim().replace(/\/$/,''),key:String(key).trim()}));
    },
    async init() {
      if (!configured()) return false;
      if (!window.supabase?.createClient) throw new Error('Could not load Supabase JavaScript. Check internet access.');
      let cfg=getConfig();
      client=window.supabase.createClient(cfg.url.replace(/\/$/,''), cfg.key, {auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
      const session=result(await client.auth.getSession());
      user=session.session?.user || null;
      return true;
    },
    async signIn(email) {
      if(!client) throw new Error('Configure Supabase first.');
      let r=await client.auth.signInWithOtp({ email, options:{emailRedirectTo:new URL('./',location.href).href} });
      result(r);
    },
    onAuthChange(callback) {
      if(!client) return;
      client.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;setTimeout(()=>callback(user),0);});
    },
    async signOut(){ if(client) result(await client.auth.signOut()); user=null; },
    getUser(){return user;},
    async fetchState(){check();const data=result(await client.from('myco_trial_state').select('data,revision,updated_at').eq('user_id',user.id).maybeSingle());return data;},
    async writeState(data, expectedRevision){check();const x=result(await client.rpc('myco_save_trial',{p_expected_revision:Number(expectedRevision),p_data:data}));return Number(x);},
    async listPhotos(){check();return result(await client.from('myco_photos').select('id,day,bag,date,caption,created,path,original_name').eq('user_id',user.id).order('created',{ascending:false}));},
    async uploadPhoto(p) {
      check();
      const path=`${user.id}/${p.id}.jpg`;
      const item=client.storage.from('myco-photos');
      const uploaded=await item.upload(path,p.blob,{contentType:'image/jpeg',cacheControl:'3600',upsert:false});
      if(uploaded.error && !/already exists|duplicate/i.test(uploaded.error.message)) throw new Error('Photo upload: '+uploaded.error.message);
      const entry={user_id:user.id,id:p.id,day:Number(p.day),bag:p.bag,date:p.date,caption:p.caption||'',created:p.created,path,original_name:p.originalName||''};
      result(await client.from('myco_photos').upsert(entry,{onConflict:'user_id,id'}));
      return entry;
    },
    async deletePhoto(p){check(); if(p.path){result(await client.storage.from('myco-photos').remove([p.path]));} result(await client.from('myco_photos').delete().eq('user_id',user.id).eq('id',p.id));},
    async signedUrl(path){check();const data=result(await client.storage.from('myco-photos').createSignedUrl(path,3600));return data.signedUrl;},
    async downloadPhoto(path){check();return result(await client.storage.from('myco-photos').download(path));},
  };
})();
