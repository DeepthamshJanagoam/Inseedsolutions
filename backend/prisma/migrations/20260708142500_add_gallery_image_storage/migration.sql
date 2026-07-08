CREATE TABLE "GalleryImage" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GalleryImage_filename_key" ON "GalleryImage"("filename");
CREATE INDEX "GalleryImage_createdAt_idx" ON "GalleryImage"("createdAt");
