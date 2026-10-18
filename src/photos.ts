import { createStore, del, entries, get, set } from 'idb-keyval'

let store: ReturnType<typeof createStore> | undefined

/**
 * Photos are kept in their own database, keyed by card id, so loading the card list never loads
 * them. idb-keyval allows one store per database, hence a second database. Opened on first use,
 * like the card store.
 */
function photoStore() {
  store ??= createStore('tessera-photos', 'photos')
  return store
}

export async function getPhoto(cardId: string): Promise<Blob | undefined> {
  return get<Blob>(cardId, photoStore())
}

export async function savePhoto(cardId: string, photo: Blob): Promise<void> {
  await set(cardId, photo, photoStore())
}

export async function deletePhoto(cardId: string): Promise<void> {
  await del(cardId, photoStore())
}

/** Every stored photo, by card id. */
export async function getAllPhotos(): Promise<Record<string, Blob>> {
  return Object.fromEntries(await entries<string, Blob>(photoStore()))
}
