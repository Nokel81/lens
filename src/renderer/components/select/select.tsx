// Wrapper for "react-select" component
// API docs: https://react-select.com/
import "./select.scss";

import React, { PropsWithChildren } from "react";
import { computed } from "mobx";
import { observer } from "mobx-react";
import { autobind, cssNames } from "../../utils";
import ReactSelect, { ActionMeta, components, Props as ReactSelectProps, Styles, OptionsType, GroupType, MenuProps } from "react-select"
import Creatable, { CreatableProps } from "react-select/creatable"
import { themeStore } from "../../theme.store";

const { Menu } = components;

export interface GroupedSelectOption<T> {
  label: React.ReactNode;
  options: SelectOption<T>[];
}

export interface SelectOption<T> {
  value: T;
  label: React.ReactNode | string;
}

export function createSelectOption<T>(from: T, labelMaker?: (f: T) => string | React.ReactNode): SelectOption<T> {
  return {
    value: from,
    label: labelMaker ? labelMaker(from) : from.toString(),
  }
}

export function createSelectOptions<T>(from: T[], labelMaker?: (f: T) => string | React.ReactNode): SelectOption<T>[] {
  return from.map(f => createSelectOption(f, labelMaker));
}

interface SingleProp<T> {
  value?: SelectOption<T>;
  onNewSelection?(selected: T, meta?: ActionMeta<T>): void;
}

interface MultiProp<T> {
  value?: SelectOption<T>[];
  onNewSelection?(selected: T[], meta?: ActionMeta<T>): void;
}

interface BaseSelectProps<T> extends Omit<ReactSelectProps<SelectOption<T>>, "onChange">, CreatableProps<SelectOption<T>>  {
  options: SelectOption<T>[] | GroupedSelectOption<T>[];
  themeName?: "dark" | "light" | "outlined";
}

export type SingleSelectProps<T> = BaseSelectProps<T> & SingleProp<T>;
export type MultiSelectProps<T> = BaseSelectProps<T> & MultiProp<T>;
export type SelectProps<T> = SingleSelectProps<T> | MultiSelectProps<T>;

@observer
export class Select<T> extends React.Component<SelectProps<T>> {
  @autobind()
  onKeyDown(evt: React.KeyboardEvent<HTMLElement>) {
    this.props.onKeyDown?.call(evt);
    if (evt.nativeEvent.code === "Escape") evt.stopPropagation(); // don't close the <Dialog/>
  }

  render() {
    const {
      className, onNewSelection,
      components = {}, ...props
    } = this.props;
    

    const { themeName = themeStore.activeTheme.type } = this.props;
    const themeClass = `theme-${themeName}`;
    
    components.Menu = components.Menu ?? ((props: PropsWithChildren<MenuProps<T>>) => <Menu {...props} className={cssNames(themeClass)}></Menu>);

    const selectProps = {
      ...props,
      isMulti: Array.isArray(this.props.value),
      menuPortalTarget: document.body,
      onChange: (value: SelectOption<any>, am?: ActionMeta<any>) => onNewSelection?.call(value.value, am),
      onKeyDown: this.onKeyDown,
      className: cssNames("Select", themeClass, className),
      classNamePrefix: "Select",
      components,
    }
    console.log(selectProps);
    return <ReactSelect {...selectProps}/>;
  }
}
