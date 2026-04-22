import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    await prisma.weighIn.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Prisma throws if record doesn't exist
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Delete failed" },
      { status: 404 },
    );
  }
}

