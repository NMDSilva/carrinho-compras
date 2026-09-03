export function canWriteResource(
  userRole: string,
  userId: number,
  ownerId: number | null | undefined
): boolean {
  return userRole === 'ADMIN' || ownerId === userId
}

// Alteração propositadamente incorreta, para verificar que uma verificação
// vermelha bloqueia mesmo o merge. Este branch é para ser descartado.
export function quebrado(): number {
  return 'isto não é um número'
}
