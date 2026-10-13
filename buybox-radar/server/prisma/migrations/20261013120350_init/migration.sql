-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('NEW', 'SHORTLISTED', 'REJECTED');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "website" TEXT,
    "domain" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "street" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT,
    "employeeCount" INTEGER,
    "estimatedRevenue" INTEGER,
    "revenueConfidence" DOUBLE PRECISION,
    "yearFounded" INTEGER,
    "ownerName" TEXT,
    "ownerTitle" TEXT,
    "ownerLinkedinUrl" TEXT,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "sources" TEXT[],
    "status" "CompanyStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Search" (
    "id" TEXT NOT NULL,
    "buyBox" JSONB NOT NULL,
    "buyBoxHash" TEXT NOT NULL,
    "candidateCount" INTEGER NOT NULL,
    "resultCount" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Search_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchResult" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB NOT NULL,

    CONSTRAINT "SearchResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Company_state_industry_idx" ON "Company"("state", "industry");

-- CreateIndex
CREATE INDEX "Company_domain_idx" ON "Company"("domain");

-- CreateIndex
CREATE INDEX "Company_normalizedName_city_state_idx" ON "Company"("normalizedName", "city", "state");

-- CreateIndex
CREATE INDEX "Search_buyBoxHash_idx" ON "Search"("buyBoxHash");

-- CreateIndex
CREATE INDEX "SearchResult_searchId_rank_idx" ON "SearchResult"("searchId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "SearchResult_searchId_companyId_key" ON "SearchResult"("searchId", "companyId");

-- AddForeignKey
ALTER TABLE "SearchResult" ADD CONSTRAINT "SearchResult_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchResult" ADD CONSTRAINT "SearchResult_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
