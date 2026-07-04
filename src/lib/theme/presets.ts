// AUTO-GENERATED. See docs/DESIGN_SYSTEM.md, section "Theme presets", for how this was built.
// Every preset supplies a full navy + saffron scale so existing bg-navy-800,
// text-saffron-600 etc. classes across the app keep working unchanged; only what
// those tokens resolve to (via CSS variables, see theme/apply.ts) changes per society.
// cream/paid/pend/over stay fixed across every theme on purpose: a neutral background
// and unambiguous status colors regardless of which brand theme is active.
// The first preset uses the exact original hex values, not regenerated ones, so the
// default look has zero drift from what Rajhans Tower already has.
export interface ThemeScale { hex: string; rgb: string }
export interface ThemePreset {
  key: string
  labelGu: string
  labelEn: string
  navy: Record<string, ThemeScale>
  saffron: Record<string, ThemeScale>
}

export const themePresets: ThemePreset[] = [
  {
    "key": "navy-saffron",
    "labelGu": "નેવી અને કેસરી (મૂળ)",
    "labelEn": "Navy and Saffron (default)",
    "navy": {
      "50": {
        "hex": "#EEF1F6",
        "rgb": "238 241 246"
      },
      "100": {
        "hex": "#D9DFEA",
        "rgb": "217 223 234"
      },
      "300": {
        "hex": "#8A99B5",
        "rgb": "138 153 181"
      },
      "400": {
        "hex": "#5B6E92",
        "rgb": "91 110 146"
      },
      "600": {
        "hex": "#2C3E5D",
        "rgb": "44 62 93"
      },
      "700": {
        "hex": "#223149",
        "rgb": "34 49 73"
      },
      "800": {
        "hex": "#1B2740",
        "rgb": "27 39 64"
      },
      "900": {
        "hex": "#141D30",
        "rgb": "20 29 48"
      },
      "950": {
        "hex": "#0B1220",
        "rgb": "11 18 32"
      }
    },
    "saffron": {
      "50": {
        "hex": "#FEF6E7",
        "rgb": "254 246 231"
      },
      "100": {
        "hex": "#FCEACB",
        "rgb": "252 234 203"
      },
      "300": {
        "hex": "#F5BE6B",
        "rgb": "245 190 107"
      },
      "400": {
        "hex": "#EFA53C",
        "rgb": "239 165 60"
      },
      "500": {
        "hex": "#E68F1B",
        "rgb": "230 143 27"
      },
      "600": {
        "hex": "#C97710",
        "rgb": "201 119 16"
      },
      "700": {
        "hex": "#A05E0C",
        "rgb": "160 94 12"
      }
    }
  },
  {
    "key": "deep-teal-marigold",
    "labelGu": "ટીલ અને મેરીગોલ્ડ",
    "labelEn": "Deep Teal & Marigold",
    "navy": {
      "50": {
        "hex": "#EEF5F6",
        "rgb": "238 245 246"
      },
      "100": {
        "hex": "#D7E8EA",
        "rgb": "215 232 234"
      },
      "300": {
        "hex": "#82B7BF",
        "rgb": "130 183 191"
      },
      "400": {
        "hex": "#50919B",
        "rgb": "80 145 155"
      },
      "600": {
        "hex": "#2F555B",
        "rgb": "47 85 91"
      },
      "700": {
        "hex": "#244247",
        "rgb": "36 66 71"
      },
      "800": {
        "hex": "#1F393D",
        "rgb": "31 57 61"
      },
      "900": {
        "hex": "#17292C",
        "rgb": "23 41 44"
      },
      "950": {
        "hex": "#0E191B",
        "rgb": "14 25 27"
      }
    },
    "saffron": {
      "50": {
        "hex": "#FDF6E8",
        "rgb": "253 246 232"
      },
      "100": {
        "hex": "#FAEBCC",
        "rgb": "250 235 204"
      },
      "300": {
        "hex": "#F1C66F",
        "rgb": "241 198 111"
      },
      "400": {
        "hex": "#ECB341",
        "rgb": "236 179 65"
      },
      "500": {
        "hex": "#E8A217",
        "rgb": "232 162 23"
      },
      "600": {
        "hex": "#C88C14",
        "rgb": "200 140 20"
      },
      "700": {
        "hex": "#9E6E10",
        "rgb": "158 110 16"
      }
    }
  },
  {
    "key": "maroon-gold",
    "labelGu": "મરૂન અને ગોલ્ડ",
    "labelEn": "Maroon & Gold",
    "navy": {
      "50": {
        "hex": "#F6EEF0",
        "rgb": "246 238 240"
      },
      "100": {
        "hex": "#EAD7DA",
        "rgb": "234 215 218"
      },
      "300": {
        "hex": "#BD848E",
        "rgb": "189 132 142"
      },
      "400": {
        "hex": "#98525E",
        "rgb": "152 82 94"
      },
      "600": {
        "hex": "#5A3037",
        "rgb": "90 48 55"
      },
      "700": {
        "hex": "#46252B",
        "rgb": "70 37 43"
      },
      "800": {
        "hex": "#3C2025",
        "rgb": "60 32 37"
      },
      "900": {
        "hex": "#2B171B",
        "rgb": "43 23 27"
      },
      "950": {
        "hex": "#1B0E10",
        "rgb": "27 14 16"
      }
    },
    "saffron": {
      "50": {
        "hex": "#FCF7E8",
        "rgb": "252 247 232"
      },
      "100": {
        "hex": "#F9EDCD",
        "rgb": "249 237 205"
      },
      "300": {
        "hex": "#EFCB71",
        "rgb": "239 203 113"
      },
      "400": {
        "hex": "#EABB43",
        "rgb": "234 187 67"
      },
      "500": {
        "hex": "#E6AC19",
        "rgb": "230 172 25"
      },
      "600": {
        "hex": "#C59416",
        "rgb": "197 148 22"
      },
      "700": {
        "hex": "#9C7511",
        "rgb": "156 117 17"
      }
    }
  },
  {
    "key": "forest-green-amber",
    "labelGu": "ફોરેસ્ટ ગ્રીન અને એમ્બર",
    "labelEn": "Forest Green & Amber",
    "navy": {
      "50": {
        "hex": "#EFF6F2",
        "rgb": "239 246 242"
      },
      "100": {
        "hex": "#D8E9E1",
        "rgb": "216 233 225"
      },
      "300": {
        "hex": "#86BBA2",
        "rgb": "134 187 162"
      },
      "400": {
        "hex": "#549677",
        "rgb": "84 150 119"
      },
      "600": {
        "hex": "#325846",
        "rgb": "50 88 70"
      },
      "700": {
        "hex": "#274537",
        "rgb": "39 69 55"
      },
      "800": {
        "hex": "#213B2F",
        "rgb": "33 59 47"
      },
      "900": {
        "hex": "#182A22",
        "rgb": "24 42 34"
      },
      "950": {
        "hex": "#0F1A15",
        "rgb": "15 26 21"
      }
    },
    "saffron": {
      "50": {
        "hex": "#FDF5E8",
        "rgb": "253 245 232"
      },
      "100": {
        "hex": "#FAE9CC",
        "rgb": "250 233 204"
      },
      "300": {
        "hex": "#F1C16F",
        "rgb": "241 193 111"
      },
      "400": {
        "hex": "#ECAD41",
        "rgb": "236 173 65"
      },
      "500": {
        "hex": "#E89B17",
        "rgb": "232 155 23"
      },
      "600": {
        "hex": "#C88614",
        "rgb": "200 134 20"
      },
      "700": {
        "hex": "#9E6A10",
        "rgb": "158 106 16"
      }
    }
  },
  {
    "key": "indigo-coral",
    "labelGu": "ઇન્ડિગો અને કોરલ",
    "labelEn": "Indigo & Coral",
    "navy": {
      "50": {
        "hex": "#EFEEF6",
        "rgb": "239 238 246"
      },
      "100": {
        "hex": "#D8D7EA",
        "rgb": "216 215 234"
      },
      "300": {
        "hex": "#8784BD",
        "rgb": "135 132 189"
      },
      "400": {
        "hex": "#565298",
        "rgb": "86 82 152"
      },
      "600": {
        "hex": "#32305A",
        "rgb": "50 48 90"
      },
      "700": {
        "hex": "#272546",
        "rgb": "39 37 70"
      },
      "800": {
        "hex": "#22203C",
        "rgb": "34 32 60"
      },
      "900": {
        "hex": "#18172B",
        "rgb": "24 23 43"
      },
      "950": {
        "hex": "#0F0E1B",
        "rgb": "15 14 27"
      }
    },
    "saffron": {
      "50": {
        "hex": "#FCEEE8",
        "rgb": "252 238 232"
      },
      "100": {
        "hex": "#F9D9CD",
        "rgb": "249 217 205"
      },
      "300": {
        "hex": "#EE9372",
        "rgb": "238 147 114"
      },
      "400": {
        "hex": "#E87045",
        "rgb": "232 112 69"
      },
      "500": {
        "hex": "#E3511C",
        "rgb": "227 81 28"
      },
      "600": {
        "hex": "#C34618",
        "rgb": "195 70 24"
      },
      "700": {
        "hex": "#9A3713",
        "rgb": "154 55 19"
      }
    }
  },
  {
    "key": "charcoal-turquoise",
    "labelGu": "ચારકોલ અને ટર્કોઈઝ",
    "labelEn": "Charcoal & Turquoise",
    "navy": {
      "50": {
        "hex": "#F0F2F4",
        "rgb": "240 242 244"
      },
      "100": {
        "hex": "#DCE0E5",
        "rgb": "220 224 229"
      },
      "300": {
        "hex": "#939FAE",
        "rgb": "147 159 174"
      },
      "400": {
        "hex": "#657486",
        "rgb": "101 116 134"
      },
      "600": {
        "hex": "#3B444E",
        "rgb": "59 68 78"
      },
      "700": {
        "hex": "#2E353D",
        "rgb": "46 53 61"
      },
      "800": {
        "hex": "#272D34",
        "rgb": "39 45 52"
      },
      "900": {
        "hex": "#1D2126",
        "rgb": "29 33 38"
      },
      "950": {
        "hex": "#121417",
        "rgb": "18 20 23"
      }
    },
    "saffron": {
      "50": {
        "hex": "#EBF9F8",
        "rgb": "235 249 248"
      },
      "100": {
        "hex": "#D4F2F0",
        "rgb": "212 242 240"
      },
      "300": {
        "hex": "#84DBD6",
        "rgb": "132 219 214"
      },
      "400": {
        "hex": "#5DD0C8",
        "rgb": "93 208 200"
      },
      "500": {
        "hex": "#39C6BC",
        "rgb": "57 198 188"
      },
      "600": {
        "hex": "#31AAA2",
        "rgb": "49 170 162"
      },
      "700": {
        "hex": "#278680",
        "rgb": "39 134 128"
      }
    }
  }
]

export const defaultThemeKey = themePresets[0].key

export function getPreset(key: string): ThemePreset {
  return themePresets.find(p => p.key === key) ?? themePresets[0]
}
