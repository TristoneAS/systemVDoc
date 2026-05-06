import React from "react";
import NuevoDocumento from "../../components/NuevoDocumento";
import RequireAdminRoute from "../../components/RequireAdminRoute";

function page() {
  return (
    <RequireAdminRoute>
      <NuevoDocumento />
    </RequireAdminRoute>
  );
}

export default page;
