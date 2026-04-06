import { v4 as uuidv4 } from 'uuid';

const VISITOR_ID_KEY = 'ocl_visitor_id';

/**
 * Gets the persistent visitor ID from localStorage.
 * If it doesn't exist, generates a new one and stores it.
 */
export const getVisitorId = (): string => {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  
  if (!id) {
    id = uuidv4();
    localStorage.setItem(VISITOR_ID_KEY, id);
    console.log('[VisitorID] Generated new ID:', id);
  }
  
  return id || '';
};
