import React from "react";
import Configuracion from "../../components/Configuracion";
import RequireAdminRoute from "../../components/RequireAdminRoute";

function page() {
  return (
    <RequireAdminRoute>
      <Configuracion />
    </RequireAdminRoute>
  );
}

export default page;
