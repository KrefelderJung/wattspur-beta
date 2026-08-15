# Standard: Anlagenabgänge an Unter-Sammelschienen

Wenn eine Sammelschiene einen inline vorgeschalteten Zähler und weitere Anlagen
enthält, richtet sich ihre Höhe am höchsten sichtbaren elektrischen Anschluss
aus. Das ist bei einer normalen Anlage die Kartenoberkante, bei einem
vorgeschalteten Einzelzähler aber die Oberkante des Inline-Zählers. Damit haben
alle `SK → AK`- bzw. `SK → ZK`-Abgänge denselben senkrechten Abstand.

Der Abgang zum Inline-Zähler darf deshalb länger sein und bestimmt nicht die
Bus-Höhe der übrigen Anlagen. Umgekehrt darf die größere Anlagenkarte unter
dem Inline-Zähler den Bus nicht künstlich nach unten drücken. So bleibt die
Darstellung auch dann einheitlich, wenn alle Anlagen einer unteren Schiene
jeweils einen eigenen Zähler erhalten.

## Knotenregel nach Zählerrolle

- `meterScope: base` bezeichnet eine Kaskadenstufe. Der Zähler erhält immer
  einen sichtbaren Sammelschienenknoten – auch bei nur einer Anlage oder bei
  einer bewusst leer erhaltenen Stufe.
- `meterScope: asset` bezeichnet einen anlagenbezogenen Einzelzähler. Bei
  genau einer Anlage bleibt der Abgang direkt und ohne eigenen Sammelschienen-
  knoten. Ab zwei Anlagen wird daraus eine eigene Sammelschiene mit Knoten.

Diese fachliche Unterscheidung muss in Renderer und Leitungsrouter gemeinsam
verwendet werden. Ein rein mengenabhängiger Test wie „eine Anlage = kein
Knoten“ ist für Kaskadenzähler nicht zulässig.

## Einzelzähler ohne doppelten Abgang

Ein anlagenbezogener Einzelzähler mit genau einer Anlage besitzt keinen eigenen
Sammelschienenbus. Die Leitung unterhalb des Zählers wird deshalb nur einmal
vom Zähler bis zur Anlage gezeichnet. Eine zusätzliche Zuleitung zu einem
virtuellen Unterbus würde auf derselben Achse liegen und den Zähler optisch
überschneiden.
