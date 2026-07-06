export type Width = 'w45' | 'w92' | 'w154' | 'w185' | 'w300' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original'

export const isWidth = (width: unknown): width is Width =>
  typeof width === 'string' && [
    'w45',
    'w92',
    'w154',
    'w185',
    'w300',
    'w342',
    'w500',
    'w780',
    'w1280',
    'original',
  ].includes(width)
