/** Logs JSON em linha única (observabilidade / agregadores). */
export function logStructured(event: string, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }));
}

/** Serializa erro para logs (inclui stack); não enviar isto ao cliente. */
export function errorFields(e: unknown): { message: string; name?: string; stack?: string } {
  if (e instanceof Error) {
    return { message: e.message, name: e.name, stack: e.stack };
  }
  return { message: String(e) };
}
