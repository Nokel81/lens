import './spinner.scss'

import React from 'react'
import { cssNames } from "../../utils"

interface Props extends React.HTMLProps<any> {
  singleColor?: boolean;
  center?: boolean;
}

export class Spinner extends React.Component<Props> {
  private elem: HTMLElement;

  static defaultProps = {
    singleColor: true,
    center: false,
  };

  render(): React.ReactNode {
    const { center, singleColor, ...props } = this.props
    let { className } = this.props
    className = cssNames('Spinner', className, {
      singleColor,
      center,
    })
    return <div {...props} className={className} ref={e => this.elem = e} />
  }
}
