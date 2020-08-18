// Ace code editor - https://ace.c9.io
// Playground - https://ace.c9.io/build/kitchen-sink.html
import "./ace-editor.scss"

import React from "react"
import { observer } from "mobx-react"
import AceBuild, { Ace } from "ace-builds"
import { autobind, cssNames } from "../../utils"
import { themeStore } from "../../theme.store"

interface Props extends Partial<Ace.EditorOptions> {
  className?: string;
  autoFocus?: boolean;
  hidden?: boolean;
  cursorPos?: Ace.Point;
  onChange?(value: string, delta: Ace.Delta): void;
  onCursorPosChange?(point: Ace.Point): void;
}

interface State {
  ready?: boolean;
}

const defaultProps: Partial<Props> = {
  value: "",
  mode: "yaml",
  tabSize: 2,
  showGutter: true, // line-numbers
  foldStyle: "markbegin",
  printMargin: false,
  useWorker: false,
}

@observer
export class AceEditor extends React.Component<Props, State> {
  static defaultProps = defaultProps as Props;

  private editor: Ace.Editor;
  private elem: HTMLElement;

  constructor(props: Props) {
    super(props)
    require("ace-builds/src-noconflict/mode-yaml")
    require("ace-builds/src-noconflict/theme-dreamweaver")
    require("ace-builds/src-noconflict/theme-terminal")
    require("ace-builds/src-noconflict/ext-searchbox")
  }

  get theme(): string {
    switch (themeStore.activeTheme.type) {
      case "light":
        return "dreamweaver"
      case "dark":
        return "terminal"
    }
  }

  async componentDidMount(): Promise<void> {
    const {
      mode, autoFocus, className, hidden, cursorPos,
      onChange, onCursorPosChange, children,
      ...options
    } = this.props

    // setup editor
    this.editor = AceBuild.edit(this.elem, options)
    this.setTheme(this.theme)
    this.setMode(mode)
    this.setCursorPos(cursorPos)

    // bind events
    this.editor.on("change", this.onChange)
    this.editor.selection.on("changeCursor", this.onCursorPosChange)

    if (autoFocus) {
      this.focus()
    }
  }

  componentDidUpdate(): void {
    if (!this.editor) return
    const { value, cursorPos } = this.props
    if (value !== this.getValue()) {
      this.editor.setValue(value)
      this.editor.clearSelection()
      this.setCursorPos(cursorPos || this.editor.getCursorPosition())
    }
  }

  componentWillUnmount(): void {
    if (this.editor) {
      this.editor.destroy()
    }
  }

  resize(): void {
    if (this.editor) {
      this.editor.resize()
    }
  }

  focus(): void {
    if (this.editor) {
      this.editor.focus()
    }
  }

  getValue(): string {
    return this.editor.getValue()
  }

  setMode(mode: string): void {
    this.editor.session.setMode(`ace/mode/${mode}`)
  }

  setTheme(theme: string): void {
    this.editor.setTheme(`ace/theme/${theme}`)
  }

  setCursorPos(pos: Ace.Point): void {
    if (!pos) return
    const { row, column } = pos
    this.editor.moveCursorToPosition(pos)
    requestAnimationFrame(() => {
      this.editor.gotoLine(row + 1, column, false)
    })
  }

  @autobind()
  onCursorPosChange(): void {
    const { onCursorPosChange } = this.props
    if (onCursorPosChange) {
      onCursorPosChange(this.editor.getCursorPosition())
    }
  }

  @autobind()
  onChange(delta: Ace.Delta): void {
    const { onChange } = this.props
    if (onChange) {
      onChange(this.getValue(), delta)
    }
  }

  render(): React.ReactNode {
    const { className, hidden } = this.props
    const themeType = themeStore.activeTheme.type
    return (
      <div className={cssNames("AceEditor", className, { hidden }, themeType)}>
        <div className="editor" ref={e => this.elem = e} />
      </div>
    )
  }
}