import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        _count: {
          select: {
            users: true,
            repairJobs: true,
            stockItems: true,
            sales: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(branches);
  } catch (error: any) {
    console.error("Error fetching branches:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, code, address, phone, taxId } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        code: code.toUpperCase().trim(),
        address,
        phone,
        taxId,
      },
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error: any) {
    console.error("Error creating branch:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, code, address, phone, taxId } = body;

    if (!id) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 });
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        name,
        code: code.toUpperCase().trim(),
        address,
        phone,
        taxId,
      },
    });

    return NextResponse.json(branch);
  } catch (error: any) {
    console.error("Error updating branch:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 });
    }

    await prisma.branch.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting branch:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
