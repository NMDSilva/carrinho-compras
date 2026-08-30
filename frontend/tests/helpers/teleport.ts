// Dialog/AlertDialog/Combobox do shadcn-vue (reka-ui) só inserem o conteúdo
// teleportado no DOM um macrotask depois do mount (o `nextTick()` do Vue,
// que só espera microtasks, não chega) — usar depois de montar um
// componente com attachTo: document.body e antes de consultar o `body`.
export function flushTeleport() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0))
}
