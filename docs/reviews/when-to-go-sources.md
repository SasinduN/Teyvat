# When to go: sources for the monsoon explainer

The default text in `site_settings.when_to_go_explainer` (migration 0022), checked on
7 November 2026. It names no rainfall figures. Admins can edit it in *Admin → Settings*.

## What each sentence rests on

| Claim in the default text | Source |
|---|---|
| Four periods: first inter-monsoon March to April, southwest monsoon May to September, second inter-monsoon October to November, northeast monsoon December to February | Department of Meteorology [1]; Sri Lanka tourism [2]; JICA [3], for the two monsoons |
| Southwest monsoon: rain mainly on the southwest and the hill country | Department of Meteorology [1]; Sri Lanka tourism [2] |
| The east coast and the north are the better choice in those months | Sri Lanka tourism [2]; Rough Guides [4]; Scott Dunn [5] |
| Northeast monsoon: rain mainly on the east and the north | Department of Meteorology [1] |
| December to February is the main season for the west coast, south coast and hill country | Sri Lanka tourism [2], for the southwest coast; Rough Guides [4] |
| Inter-monsoon periods: afternoon thunder showers over most of the island | Department of Meteorology [1]; Sri Lanka tourism [2], for March and April |
| October and November: heavy rain can fall anywhere | Rough Guides [4]; Sri Lanka tourism [2] ("occasional heavy showers across the island") |

## Sources read

1. **Department of Meteorology, Sri Lanka.** M.D. Dayananda, *Meteorological Observations and
   Instrumental Systems for Meteorological Services in Sri Lanka*, JMA/WMO workshop, Tokyo,
   July 2010. <https://www.jma.go.jp/jma/en/Activities/qmws_2010/Presentation/S404_Dayananda.pdf>
   The Department's own website, <https://meteo.gov.lk/>, has no climate page that could be
   reached (its older article links now open the home page), so this is the Department's most
   direct statement that could be read. It is from 2010.
2. **Sri Lanka tourism**, Climate Guide. <https://www.srilanka.travel/weather>
3. **JICA**, a study report on Hambantota and Monaragala, section 2.2.1, with its rainfall figures
   credited to the Meteorological Department. <https://openjicareport.jica.go.jp/pdf/11720406_03.pdf>
4. **Rough Guides**, When to go (updated 15 May 2025). <https://www.roughguides.com/sri-lanka/when-to-go/>
5. **Scott Dunn**, Best time to visit Sri Lanka. <https://www.scottdunn.com/hk/sri-lanka/best-time-to-visit>

Tried and not read: Lonely Planet (the article's text didn't load), Britannica and Audley
Travel (both refused the request), and the World Bank's Climate Knowledge Portal (refused; only
a search result's summary was seen, noted below as such).

## Where sources disagree

| Question | What they say | The default text |
|---|---|---|
| When the northeast monsoon runs | December to February: Department of Meteorology [1], Sri Lanka tourism [2], JICA [3]. October to January: Scott Dunn [5], which elsewhere on the same page says this monsoon "begins in May". September to March: the World Bank portal, from a search summary only | The Department's months, and says the rain doesn't always keep to them |
| When the southwest monsoon runs | May to September: [1], [2], [3]. May to August: the World Bank portal, from a search summary only. June to September: the Department's 2026 seasonal forecast, as a search summary framed it (a forecast period, not a definition) | The Department's months |
| Best months for the hill country | December to March: Rough Guides [4]. December to April, with hiking "until May": Scott Dunn [5]. March to April is called ideal by Sri Lanka tourism [2] | Names the monsoon's months only, not "best" months |
| Best months for the west and south coasts | December to March: [4]. West coast October to April, south coast late November to April: [5] | As above |
| When the east coast's season starts and ends | "April or May" to September: [4]. May to September: [5], and [2] for the season | "May to September", the southwest monsoon's months |
| The Cultural Triangle | March to April: [2]. March to May: [4]. September to November, "to beat the tourists": [5] | Not named: no agreement, and it isn't in the brief's regions |
| How to split the year | Four periods: [1], [2]. Two main seasons only, Maha and Yala: the World Bank portal, from a search summary only | Four |

## Stored best times that sit oddly with these sources

These come from each destination's existing `best_time`, read as written and not changed:

- **Haputale** (April – August) and **Knuckles** (June – September & December – March) are hill
  country, but include months of the southwest monsoon, when the sources above advise against
  the hill country generally. Either may be right for that side of the hills; no source read
  here settles it.
- **Anuradhapura** and **Polonnaruwa** (May – September) leave out December to March, when
  Scott Dunn calls the island's weather at its best overall. **Sigiriya**, in the same
  region, is January – September.
- **Trincomalee** (April – October) runs a month past the May to September most sources give
  for the east, and starts a month before.

## Judgement calls in reading `best_time`

- **Udawalawe**, "Year-round (Best Dec – May)": December to May, the months it names as best.
- **Dambulla**, "Year-round": all twelve, so it is "great" in every month.
- **Horton Plains**, "January – April (Early mornings)": January to April; the note is about the
  time of day.
