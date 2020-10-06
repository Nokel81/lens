import "./components/app.scss"
import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { isMac } from "../common/vars";
import { UserStore } from "../common/user-store";
import { WorkspaceStore } from "../common/workspace-store";
import { ClusterStore } from "../common/cluster-store";
import { i18nStore } from "./i18n";
import { themeStore } from "./theme.store";
import { App } from "./components/app";
import { LensApp } from "./lens-app";

type AppComponent = React.ComponentType & {
  init?(): Promise<void>;
}

export async function bootstrap(App: AppComponent) {
  const rootElem = document.getElementById("app")
  rootElem.classList.toggle("is-mac", isMac);

  // preload common stores
  await Promise.all([
    UserStore.getInstance().init(),
    WorkspaceStore.getInstance().init(),
    ClusterStore.getInstance().init(),
    i18nStore.init(),
    themeStore.init(),
  ]);

  // Register additional store listeners
  ClusterStore.getInstance().registerIpcListener();

  // init app's dependencies if any
  if (App.init) {
    await App.init();
  }
  window.addEventListener("message", (ev: MessageEvent) => {
    if (ev.data === "teardown") {
      UserStore.getInstance().unregisterIpcListener()
      WorkspaceStore.getInstance().unregisterIpcListener()
      ClusterStore.getInstance().unregisterIpcListener()
      unmountComponentAtNode(rootElem)
      window.location.href = "about:blank"
    }
  })
  render(<>
    {isMac && <div id="draggable-top" />}
    <App />
  </>, rootElem);
}

// run
bootstrap(process.isMainFrame ? LensApp : App);
