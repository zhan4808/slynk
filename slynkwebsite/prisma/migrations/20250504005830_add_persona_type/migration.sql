-- AlterTable
ALTER TABLE "AIPersona" ADD COLUMN     "personaType" TEXT DEFAULT 'default',
ADD COLUMN     "productDescription" TEXT,
ADD COLUMN     "productLink" TEXT,
ADD COLUMN     "productName" TEXT;
