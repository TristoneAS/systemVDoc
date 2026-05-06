import { NextResponse } from "next/server";
import { getNextIdDocumento } from "@/libs/next_id_documento";

export async function GET() {
  try {
    const next_id = await getNextIdDocumento();
    return NextResponse.json({ success: true, next_id });
  } catch (error) {
    console.error("next-id documento:", error);
    return NextResponse.json(
      { error: "No se pudo calcular el siguiente ID", details: error.message },
      { status: 500 },
    );
  }
}
