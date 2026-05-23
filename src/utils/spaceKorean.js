/**
 * @deprecated 화면에서 사용 금지. 이미 보정된 JSON을 다시 망가뜨립니다.
 * 띄어쓰기는 scripts/polish_statements.py (Python) 만 사용하세요.
 */



const COMPOUNDS = [

  ['계약체결당시에', '계약 체결 당시에'],

  ['계약체결', '계약 체결'],

  ['대리인에대한', '대리인에 대한'],

  ['요약자와낙약자의', '요약자와 낙약자의'],

  ['수익의의사표시', '수익의 의사표시'],

  ['기한이도래한', '기한이 도래한'],

  ['금전채무가', '금전 채무가'],

  ['금전채무', '금전 채무'],

  ['허락없이', '허락 없이'],

  ['그채무를', '그 채무를'],

  ['제3자에게', '제3자에게'],

  ['제3자는', '제3자는'],

  ['제3자가', '제3자가'],

  ['제3자의', '제3자의'],

  ['할수있다', '할 수 있다'],

  ['할수없다', '할 수 없다'],

  ['할수', '할 수'],

  ['있어야한다', '있어야 한다'],

  ['받지못한', '받지 못한'],

  ['변경시킬수', '변경시킬 수'],

]



const SPACE_AFTER = [

  '제3자는', '제3자가', '제3자의', '제3자에게',

  '대리인에 대한', '대리인은', '대리인의',

  '요약자의', '낙약자는', '본인의', '이유로', '경우', '당시에',

]



const CLEANUP = [

  [/제\s*3\s*자/g, '제3자'],

  [/이\s+행/g, '이행'],

  [/의\s+사\s+표시/g, '의사표시'],

  [/의\s+사\b/g, '의사'],

  [/못한\s+다\b/g, '못한다'],

  [/대리인에대한/g, '대리인에 대한'],

  [/허락\s*없이/g, '허락 없이'],

  [/없이\s*그/g, '없이 그'],

  [/,\s*([가-힣])/g, ', $1'],

]



function spaceAfter(s) {

  for (const phrase of SPACE_AFTER) {

    s = s.replace(new RegExp(`(${phrase})(?=[가-힣])`, 'g'), '$1 ')

  }

  s = s.replace(/([가-힣]{2,})의([가-힣]{2,})/g, '$1의 $2')

  s = s.replace(/(?<=[가-힣])(을|를)(?=[가-힣])/g, '$1 ')

  return s

}



/** @param {string} text */

export function spaceKorean(text) {

  if (!text || typeof text !== 'string') return text || ''

  let s = text.replace(/\s+/g, ' ').trim().replace(/ /g, '')

  for (const [a, b] of COMPOUNDS) s = s.split(a).join(b)

  s = spaceAfter(s)

  for (const [pat, repl] of CLEANUP) s = s.replace(pat, repl)

  return s.replace(/\s+/g, ' ').trim()

}


