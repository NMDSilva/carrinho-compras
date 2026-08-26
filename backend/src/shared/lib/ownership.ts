export function canWriteResource(
  userRole: string,
  userId: number,
  ownerId: number | null | undefined
): boolean {
  return userRole === 'ADMIN' || ownerId === userId
}
