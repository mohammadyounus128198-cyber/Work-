// Persistent Identity Layer (IndexedDB + Ed25519)
const DB_NAME = "omega_identity";
const STORE = "keys";

/**
 * Open the `omega_identity` IndexedDB database and ensure the `keys` object store exists.
 * @returns {Promise<IDBDatabase>} The opened database instance.
 */
function openDB(){
  return new Promise((res,rej)=>{
    const req = indexedDB.open(DB_NAME,1);
    req.onupgradeneeded = ()=>{
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = ()=>res(req.result);
    req.onerror = ()=>rej(req.error);
  });
}

/**
 * Persist an Ed25519 key pair into the module's IndexedDB record `"identity"`.
 *
 * Stores the public key as SPKI and private key as PKCS8, both Base64-encoded, in the `keys` object store under the fixed key `"identity"`.
 *
 * @param {{ publicKey: CryptoKey, privateKey: CryptoKey }} keyPair - The Ed25519 key pair to persist; `publicKey` will be exported as SPKI and `privateKey` as PKCS8.
 */
async function saveKeyPair(keyPair){
  const db = await openDB();
  const tx = db.transaction(STORE,"readwrite");
  const store = tx.objectStore(STORE);
  const pub = await crypto.subtle.exportKey("spki",keyPair.publicKey);
  const priv = await crypto.subtle.exportKey("pkcs8",keyPair.privateKey);
  store.put({
    publicKey: btoa(String.fromCharCode(...new Uint8Array(pub))),
    privateKey: btoa(String.fromCharCode(...new Uint8Array(priv)))
  },"identity");
}

/**
 * Load the persisted Ed25519 key pair from IndexedDB, or return null if none is stored.
 *
 * Retrieves the record keyed as "identity" from the module's object store and reconstructs
 * the public and private CryptoKey objects using Web Crypto imports when present.
 *
 * @returns {{ publicKey: CryptoKey, privateKey: CryptoKey } | null} An object containing the Ed25519 `publicKey` and `privateKey` CryptoKey instances, or `null` if no stored identity is found.
 */
async function loadKeyPair(){
  const db = await openDB();
  const tx = db.transaction(STORE,"readonly");
  const store = tx.objectStore(STORE);
  return new Promise((res)=>{
    const req = store.get("identity");
    req.onsuccess = async ()=>{
      if(!req.result) return res(null);
      const pub = Uint8Array.from(atob(req.result.publicKey),c=>c.charCodeAt(0));
      const priv = Uint8Array.from(atob(req.result.privateKey),c=>c.charCodeAt(0));
      const publicKey = await crypto.subtle.importKey("spki",pub,{name:"Ed25519"},true,["verify"]);
      const privateKey = await crypto.subtle.importKey("pkcs8",priv,{name:"Ed25519"},true,["sign"]);
      res({publicKey,privateKey});
    };
  });
}

/**
 * Ensure an Ed25519 key pair exists in IndexedDB and return it.
 * If a persisted key pair is found it is returned; otherwise a new key pair is generated, persisted, and returned.
 * @returns {Promise<{publicKey: CryptoKey, privateKey: CryptoKey}>} The Ed25519 key pair object containing `publicKey` and `privateKey` CryptoKey instances.
 */
async function getOrCreateIdentity(){
  let kp = await loadKeyPair();
  if(kp) return kp;
  kp = await crypto.subtle.generateKey({name:"Ed25519"},true,["sign","verify"]);
  await saveKeyPair(kp);
  return kp;
}

export { getOrCreateIdentity };