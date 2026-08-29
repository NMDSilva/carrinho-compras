-- Verificação de email + reposição de password (ver docs/ESQUEMA.md).
-- Tokens guardados como hash SHA-256, nunca em texto simples.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordResetTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetTokenHash" TEXT,
ADD COLUMN     "verificationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "verificationTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_verificationTokenHash_key" ON "User"("verificationTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordResetTokenHash_key" ON "User"("passwordResetTokenHash");

-- DataMigration: contas criadas antes desta funcionalidade existir ficam
-- "grandfathered" como já verificadas — só contas novas, registadas a partir
-- de agora, precisam de confirmar o email antes de conseguirem entrar.
UPDATE "User" SET "emailVerified" = true;
