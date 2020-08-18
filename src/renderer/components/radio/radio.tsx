import "./radio.scss"
import React from "react"
import { cssNames } from "../../utils"
import uniqueId from "lodash/uniqueId"

// todo: refactor with contexts

interface RadioGroupProps {
  className?: any;
  value?: any;
  asButtons?: boolean;
  disabled?: boolean;
  onChange?(value: string): void;
  children: React.ReactElement<RadioProps>[]
}

export class RadioGroup extends React.Component<RadioGroupProps> {
  render(): React.ReactNode {
    const name = uniqueId("radioGroup")
    const { value, asButtons, disabled, onChange } = this.props
    const className = cssNames("RadioGroup", { buttonsView: asButtons }, this.props.className)

    return (
      <div className={className}>
        {this.props.children.map(radio => {
          return React.cloneElement(radio, {
            name,
            disabled: disabled !== undefined ? disabled : radio.props.disabled,
            checked: radio.props.value === value,
            onChange,
          } as any)
        })}
      </div>
    )
  }
}

type RadioProps = React.HTMLProps<any> & {
  name?: string;
  label?: React.ReactNode | any;
  value?: any;
  checked?: boolean;
  disabled?: boolean;
  onChange?(value: React.ChangeEvent<HTMLInputElement>): void;
}

export class Radio extends React.Component<RadioProps> {
  private elem: HTMLElement;

  onChange = (): void => {
    const { value, onChange, checked } = this.props
    if (!checked && onChange) {
      onChange(value)
    }
  }

  onKeyDown = (e: React.KeyboardEvent<any>): void => {
    const SPACE_KEY = e.keyCode === 32
    const ENTER_KEY = e.keyCode === 13
    if (SPACE_KEY || ENTER_KEY) {
      this.elem.click()
      e.preventDefault()
    }
  }

  render(): React.ReactNode {
    const { className, label, checked, children, ...inputProps } = this.props
    const componentClass = cssNames('Radio flex align-center', className, {
      checked,
      disabled: this.props.disabled,
    })
    return (
      <label
        className={componentClass}
        tabIndex={!checked ? 0 : null}
        onKeyDown={this.onKeyDown}
        ref={e => this.elem = e}
      >
        <input {...inputProps} type="radio" checked={checked} onChange={this.onChange} />
        <i className="tick flex center" />
        {label ? <div className="label">{label}</div> : null}
        {children}
      </label>
    )
  }
}
