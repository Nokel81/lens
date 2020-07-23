// Wrapper for "react-select" component
// API docs: https://react-select.com/
import "./select.scss";

import React from "react";
import { ActionMeta } from "react-select";
import { themeStore } from "../../theme.store";

export interface GroupedOptions<T> {
    label: React.ReactNode;
    options: Option<T>[];
}

interface ToString {
    toString(): string;
}

export class Option<T extends ToString> {
    readonly value: T;
    readonly label: React.ReactNode;

    constructor(value: T, label?: React.ReactNode) {
      this.value = value;
      this.label = label ?? <span>{value.toString()}</span>;
    }
}

export type ThemeName = "dark" | "light" | "outlined";

export interface SelectProps<T> {
    value?: T;
    overrideGlobalTheme?: ThemeName;
    onChange?(value: T, meta?: ActionMeta<T>): void;
    children: Option<T>[];
}

export class Select<T> extends React.Component<SelectProps<T>> {
  private cssThemeName(): string {
    const { overrideGlobalTheme = themeStore.activeTheme.type } = this.props;
    return `theme-${overrideGlobalTheme}`;
  }
}