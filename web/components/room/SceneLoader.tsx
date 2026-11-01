"use client";

import dynamic from "next/dynamic";

// WebGL + localStorage only exist in the browser.
export const SceneLoader = dynamic(() => import("./Scene"), { ssr: false });
