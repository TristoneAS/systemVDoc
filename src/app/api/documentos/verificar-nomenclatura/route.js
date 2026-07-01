import { NextResponse } from "next/server";
import { conn } from "@/libs/system_v_docs";
import {
  existeNomenclaturaDocumento,
  normalizarNomenclatura,
} from "@/libs/nomenclatura_documento";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const term = normalizarNomenclatura(searchParams.get("nomenclatura"));

    if (!term) {
      return NextResponse.json(
        { error: "Ingrese una nomenclatura para verificar" },
        { status: 400 },
      );
    }

    const existe = await existeNomenclaturaDocumento(conn, term);

    return NextResponse.json({
      success: true,
      nomenclatura: term,
      existe,
    });
  } catch (error) {
    console.error("Error al verificar nomenclatura:", error);
    return NextResponse.json(
      {
        error: "Error al verificar la nomenclatura",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
