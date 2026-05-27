import React, { Suspense } from "react";
import Login from "./components/Login";

function page() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}

export default page;
