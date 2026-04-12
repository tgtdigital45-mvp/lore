/**
 * Imprime HTML sem abrir nova janela (evita bloqueio de pop-ups).
 * Usa iframe oculto no próprio documento; `print()` corre no mesmo ciclo do clique quando possível.
 */
export function printHtmlDocument(html: string): boolean {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Relatório para impressão");
  iframe.setAttribute("aria-hidden", "true");
  /* Fora do ecrã mas o documento interior imprime normalmente (evitar visibility:hidden — pode sair em branco). */
  iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;border:0;margin:0;padding:0;overflow:hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return false;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const remove = () => {
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
  };

  try {
    win.focus();
    win.addEventListener(
      "afterprint",
      () => {
        remove();
      },
      { once: true }
    );
    win.print();
  } catch {
    remove();
    return false;
  }

  setTimeout(remove, 120_000);
  return true;
}
