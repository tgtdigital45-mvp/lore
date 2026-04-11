/** Logs JSON em linha única (observabilidade / agregadores). */
export function logStructured(event: string, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }));
}
