import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const weighIns = await prisma.weighIn.findMany({
    orderBy: { measuredAt: "asc" },
  });
  return NextResponse.json({ weighIns });
}

