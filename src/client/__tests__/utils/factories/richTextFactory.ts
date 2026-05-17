import { RichText, TextStyle } from '@shared/dtos'
import Factory from '@tests/utils/factories/factory'

export default class RichTextFactory extends Factory<RichText> {
  protected state: RichText = {
    type: 'text',
    text: {
      content: 'The',
      link: null,
    },
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: 'default',
    },
    plain_text: 'The',
    href: null,
  }

  public text (text: string): RichTextFactory {
    this.state.text.content = text
    this.state.plain_text = text

    return this
  }

  public bold (): RichTextFactory {
    this.state.annotations.bold = true

    return this
  }

  public italic (): RichTextFactory {
    this.state.annotations.italic = true

    return this
  }

  public strikethrough (): RichTextFactory {
    this.state.annotations.strikethrough = true

    return this
  }

  public underline (): RichTextFactory {
    this.state.annotations.underline = true

    return this
  }

  public code (): RichTextFactory {
    this.state.annotations.code = true

    return this
  }

  public color (color: TextStyle['color']): RichTextFactory {
    this.state.annotations.color = color

    return this
  }

  public link (url: string): RichTextFactory {
    this.state.text.link = { url }
    this.state.href = url

    return this
  }
}
