# Anforderung: Hinweis zur Vermarktung ab mehr als 100 kW/kWp

**Stand:** 2026-08-18  
**Geltungsbereich:** Messkonzept-Konfigurator, öffentliche Beta  
**Verbindlichkeit:** Orientierungshinweis, keine Rechts- oder Förderzusage

## Ziel

Der Prüfstatus soll eine Erzeugungsanlage warnen, wenn ihre eingetragene
Nennleistung mehr als 100 kW beziehungsweise 100 kWp beträgt. Der
Objekteditor bleibt auf Eingabefelder und kurze Feldbeschreibungen beschränkt.

## Fachliche Abgrenzung

- PV und Steckersolar werden mit kWp bezeichnet. Windenergieanlagen werden mit
  kW bezeichnet.
- Bei PV- und Windenergieanlagen wird nicht behauptet, dass jede denkbare
  Betriebsweise automatisch eine Direktvermarktung auslöst. Der Hinweis sagt,
  dass die Vermarktungsform für eingespeisten Strom zu prüfen ist und häufig
  ein Direktvermarkter benötigt wird.
- Bei KWK/BHKW bezieht sich die Schwelle auf die elektrische KWK-Leistung. Bei
  mehr als 100 kW ist Direktvermarktung oder Eigenverbrauch erforderlich.
- Die Regel prüft die eingetragene Anlagenleistung (`power`), nicht die
  Wechselrichterleistung. Die Einordnung eines konkreten Projekts kann von
  Inbetriebnahme, Förderweg, Betriebsweise und weiteren gesetzlichen Vorgaben
  abhängen.

## Akzeptanzkriterien

1. Genau 100 kW/kWp löst keinen Grenzwert-Hinweis aus.
2. 100,01 kW/kWp löst im Prüfstatus die Regel `MK-ASSET-006` aus.
3. Der Hinweis erscheint ausschließlich im zentralen Prüfstatus der betroffenen
   Anlage.
4. Der Text unterscheidet EEG-Anlagen (PV/Wind) und KWK/BHKW.
5. Eine leere oder unlesbare Leistung löst keinen falschen Direktvermarktungs-
   hinweis aus.
6. Die Regel bleibt DOM-frei und wird durch positive und negative Tests
   abgesichert.

## Quellen

- [Bundesnetzagentur: EEG-Förderung und Fördersätze](https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/ErneuerbareEnergien/EEG_Foerderung/start.html)
- [§ 21 EEG 2023, Gesetze im Internet](https://www.gesetze-im-internet.de/eeg_2014/__21.html)
- [§ 4 KWKG 2025, Gesetze im Internet](https://www.gesetze-im-internet.de/kwkg_2016/__4.html)
