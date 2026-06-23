import type { LaborCatalogItem, SpecialSupplementDef, UnitaMisura } from '@/domain/types';

export const SPECIAL_WORKS: LaborCatalogItem[] = [
  { id: "ciottoli-mattone", tipologia: "CIOTTOLI", materiale: "MATTONE", prezzo: 235, um: "MQ" as UnitaMisura, supplementoAngolo: 30, note: "MATERIALE COMPRESO - TIPO GINOSA" },
  { id: "ciottoli-pietra-bianca", tipologia: "CIOTTOLI", materiale: "PIETRA BIANCA", prezzo: 280, um: "MQ" as UnitaMisura, supplementoAngolo: 30, note: "MATERIALE COMPRESO" },
  { id: "ciottoli-giallo-silva-oro", tipologia: "CIOTTOLI", materiale: "GIALLO SILVA ORO", prezzo: 280, um: "MQ" as UnitaMisura, supplementoAngolo: 30, note: "MATERIALE COMPRESO" },
  { id: "ciottoli-travertino-arcobaleno", tipologia: "CIOTTOLI", materiale: "TRAVERTINO ARCOBALENO", prezzo: 270, um: "MQ" as UnitaMisura, supplementoAngolo: 30, note: "MATERIALE COMPRESO" },
  { id: "ciottoli-materiale-fornito-da-noi", tipologia: "CIOTTOLI", materiale: "MATERIALE FORNITO DA NOI", prezzo: 210, um: "MQ" as UnitaMisura, supplementoAngolo: 30, note: "QUALSIASI MATERIALE DA NOI FORNITO" },
  { id: "ciottoli-travertino-noce", tipologia: "CIOTTOLI", materiale: "TRAVERTINO NOCE", prezzo: 270, um: "MQ" as UnitaMisura, supplementoAngolo: 30, note: "MATERIALE LO MANDIAMO NOI - CALCOLATO PREZZO FINITO INDICATIVO" },
  { id: "ciottoli-bianco-e-rosso", tipologia: "CIOTTOLI", materiale: "BIANCO E ROSSO", prezzo: 290, um: "MQ" as UnitaMisura, supplementoAngolo: 30, note: "MATERIALE LO MANDIAMO NOI - CALCOLATO PREZZO FINITO INDICATIVO" },
  { id: "pietra-lavorata-a-spacco-bianca", tipologia: "PIETRA LAVORATA A SPACCO", materiale: "BIANCA", prezzo: 270, um: "MQ" as UnitaMisura, supplementoAngolo: 140, note: "TIPO ISCHIA - MATERIALE COMPRESO" },
  { id: "pietra-lavorata-a-spacco-rossa", tipologia: "PIETRA LAVORATA A SPACCO", materiale: "ROSSA", prezzo: 270, um: "MQ" as UnitaMisura, supplementoAngolo: 140, note: "MATERIALE COMPRESO" },
  { id: "mattone-antico", tipologia: "MATTONE", materiale: "ANTICO", prezzo: 310, um: "MQ" as UnitaMisura, supplementoAngolo: 30, note: "MATTONI DI RECUPERO - MATERIALE COMPRESO" },
  { id: "mattone-rosso-tavella-da-3", tipologia: "MATTONE", materiale: "ROSSO TAVELLA DA 3", prezzo: 250, um: "MQ" as UnitaMisura, supplementoAngolo: 30, note: "COMPRESO MATERIALE" },
  { id: "mattone-tavella-da-3-altri-colori-fuori-catalogo", tipologia: "MATTONE", materiale: "TAVELLA DA 3 ALTRI COLORI FUORI CATALOGO", prezzo: 250, um: "MQ" as UnitaMisura, supplementoAngolo: 30, note: "LAVORATORI HA ALTRI MATTONI NEL SUO CATALOGO CHE NON ABBIAMO NEL NOSTRO" },
  { id: "mattone-classico-burattato", tipologia: "MATTONE", materiale: "CLASSICO BURATTATO", prezzo: 220, um: "MQ" as UnitaMisura, supplementoAngolo: 28, note: "COMPRESO MATERIALE" },
  { id: "mattone-romanico", tipologia: "MATTONE", materiale: "ROMANICO", prezzo: 220, um: "MQ" as UnitaMisura, supplementoAngolo: 28, note: "COMPRESO MATERIALE" },
  { id: "mattone-rosato", tipologia: "MATTONE", materiale: "ROSATO", prezzo: 220, um: "MQ" as UnitaMisura, supplementoAngolo: 28, note: "COMPRESO MATERIALE" },
  { id: "mattone-etrusco", tipologia: "MATTONE", materiale: "ETRUSCO", prezzo: 220, um: "MQ" as UnitaMisura, supplementoAngolo: 28, note: "COMPRESO MATERIALE" },
  { id: "mattone-da-5-cm-altri-colori-fuori-catalogo", tipologia: "MATTONE", materiale: "DA 5 CM ALTRI COLORI FUORI CATALOGO", prezzo: 220, um: "MQ" as UnitaMisura, supplementoAngolo: 28, note: "LAVORATORI HA ALTRI MATTONI NEL SUO CATALOGO CHE NON ABBIAMO NEL NOSTRO" },
  { id: "mattone-materiale-fornito-dal-cliente", tipologia: "MATTONE", materiale: "MATERIALE FORNITO DAL CLIENTE", prezzo: 180, um: "MQ" as UnitaMisura, supplementoAngolo: 30, note: "QUALSIASI MATTONE SPESSORE 3/5 FORNITO DAL CLIENTE" },
  { id: "gettato-cemento-rasato-solo-da-pitturare", tipologia: "GETTATO", materiale: "CEMENTO RASATO - SOLO DA PITTURARE", prezzo: 130, um: "MQ" as UnitaMisura, supplementoAngolo: 0, note: "COMPRESO MATERIALE - ANGOLI NON PREVISTI - ZOCCOLO DA QUANTIFICARE A PARTE" },
  { id: "gettato-pietra-fornita-dal-cliente", tipologia: "GETTATO", materiale: "PIETRA FORNITA DAL CLIENTE", prezzo: 130, um: "MQ" as UnitaMisura, supplementoAngolo: 0, note: "IN CASO DI ANGOLI DA FORNIRE PEZZI AD ANGOLO" },
  { id: "gettato-mattoni-refrattari-6-cm", tipologia: "GETTATO", materiale: "MATTONI REFRATTARI 6 CM", prezzo: 215, um: "MQ" as UnitaMisura, supplementoAngolo: 0, note: "COMPRESO MATERIALE" },
  { id: "gettato-mattoni-refrattari-7-8-cm", tipologia: "GETTATO", materiale: "MATTONI REFRATTARI 7/8 CM", prezzo: 255, um: "MQ" as UnitaMisura, supplementoAngolo: 0, note: "COMPRESO MATERIALE" },
  { id: "soglie-cotto", tipologia: "SOGLIE", materiale: "COTTO", prezzo: 175, um: "ML" as UnitaMisura, supplementoAngolo: 0, note: "COMPRESO MATERIALE" },
];

export const SPECIAL_SUPPLEMENTS: SpecialSupplementDef[] = [
  { id: "supplemento-per-gettati-con-angoli-a-45", nome: "SUPPLEMENTO PER GETTATI CON ANGOLI A 45°", note: "SOLO PER PIETRA E CIOTTOLI - NO MATTONI", tipo: 'PERCENT', valore: 0.2 },
  { id: "supplemento-pezzi-gettati-in-2-volte", nome: "SUPPLEMENTO PEZZI GETTATI IN 2 VOLTE", note: "SOLO SE RIGIRO E' SUPERIORE A 6 CM", tipo: 'PEZZO', valore: 5 },
  { id: "supplemento-pezzi-gettati-in-3-volte", nome: "SUPPLEMENTO PEZZI GETTATI IN 3 VOLTE", note: "SOLO SE RIGIRO E' SUPERIORE A 6 CM", tipo: 'PEZZO', valore: 10 },
];
