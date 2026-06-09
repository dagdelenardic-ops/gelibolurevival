# Çanakkale — Kampanya Hareket Rehberi ("Mekke")

> **Bu, haritadaki her birimin gün-gün NEREDEN NEREYE hareket ettiğinin tek doğruluk kaynağıdır.**
> Makine tarafı: [`src/data/campaign-movement.js`](../src/data/campaign-movement.js) — bu belge onun insan-okunur aynasıdır. Biri değişince diğeri de güncellenmeli.

## Nasıl çalışır?

Her birim, **ardışık tarihli keyframe** dizisi olarak yazılır. Çözümleyici iki keyframe arasında **yumuşak (ease-in-out) interpolasyon** yaparak belgesel gibi akıcı günlük hareket üretir; birim artık aylarca tek noktada donup sonra ışınlanmaz.

- **`hold`** = sonraki keyframe'e kadar burada bekle (cephe hattı)
- **`march`** = bu noktadan sonraki keyframe'in noktasına doğru gün-gün **yürü** (rota)
- **`land`** = kesin çıkarma/olay noktası

Off-map dönemler (ihtiyat/karargâh, tahliye-sonrası, batma) BURAYA yazılmaz; onları mevcut `unit-sectors` reserve-gate'i ve `canonical-positions` end-state'leri (sunk/withdrawn/evacuated) yönetir. Bu rehber yalnızca **harita-üstü** hareketi tanımlar ve `getHistoricalPlacementForUnit` içinde **en yüksek öncelikli** konum kaynağıdır.

Kaynaklar: Peter Hart, *Gallipoli* (2011); Anzac Portal & Te Ara harita serileri; AWM / NZ History Anzac-Suvla cephe haritaları; The National Archives Gelibolu harita ekleri; Dardanelles defences 1915.

---

## OSMANLI KARA KUVVETLERİ

### 19. Tümen — Yrb. Mustafa Kemal *(kampanyanın en hareketli birliği)*
| Tarih | Hareket | Tür | Gerekçe |
|---|---|---|---|
| 25 Nis | Bigalı → Conkbayırı | march | Bigalı ihtiyatından koşu — "ölmeyi emrediyorum" |
| 26 Nis | Conkbayırı sırtı | hold | Arıburnu karşı taarruz hattı kuruldu |
| 19 May | Arıburnu siperlerine lunge | hold | 19 Mayıs genel taarruzu |
| 20 May | Hatta dönüş | hold | Taarruz ağır kayıpla püskürtüldü |
| 8 Ağu | Conkbayırı → Anafartalar | march | M. Kemal Anafartalar Grup Komutanlığına |
| 11 Ağu | Anafartalar | hold | Anafartalar-Suvla cephesi savunması |

### 57. Alay — Yrb. Hüseyin Avni *(19. Tümen öncüsü)*
| Tarih | Hareket | Tür | Gerekçe |
|---|---|---|---|
| 25 Nis | Bigalı → Conkbayırı | march | Öncü olarak zirveye koştu |
| 27 Nis | Arıburnu hattı | hold | Subay kadrosu şehit; çıkarmayı durdurdu |
| 19 May | İleri lunge | march | 19 Mayıs taarruzu |
| 20 May → tahliye | Arıburnu siperleri | hold | Yeniden teşkil; siper savunması |

### 27. Alay — Yrb. Şefik Aker *(Arıburnu ilk teması)*
| Tarih | Hareket | Tür | Gerekçe |
|---|---|---|---|
| 3 Kas | Eceabat/Maydos | hold | Yarımada savunması |
| 25 Nis | Eceabat → Arıburnu | march | İlk temas savunmasına sevk |
| 27 Nis | Arıburnu hattı | hold | Çıkarmayı geciktirdi |
| 6 Ağu | Arıburnu → Conkbayırı | march | Sarı Bayır savunmasına kaydırıldı |
| 9 Ağu → tahliye | Conkbayırı sırtı | hold | Kritik mevziler |

### 3. Kolordu — Tümg. Esat Paşa
| Tarih | Hareket | Tür | Gerekçe |
|---|---|---|---|
| 25 Nis → tahliye | Conkbayırı (cephe gerisi) | hold | Arıburnu-Conkbayırı cephe komutası |

### 9. Tümen — Alb. Halil Sami *(Boğaz → Helles)*
| Tarih | Hareket | Tür | Gerekçe |
|---|---|---|---|
| 3 Kas | Kilitbahir güneyi | hold | Boğaz tahkimat savunması |
| 25 Nis | Boğaz → Helles | march | Helles çıkarmasına karşı güney cepheye sevk |
| 28 Nis → tahliye | Seddülbahir-Kirte hattı | hold | İngiliz köprübaşını çevreledi |

### 7. Tümen — Alb. Remzi Bey *(Seddülbahir V/W Beach)*
| Tarih | Hareket | Tür | Gerekçe |
|---|---|---|---|
| 3 Kas | Seddülbahir | hold | Güney kıyı savunması |
| 25 Nis | V/W Beach | hold | River Clyde'a makineli tüfek direnişi |
| 1 Tem | Seddülbahir → Alçıtepe | march | Kirte sonrası Alçıtepe hattına çekildi |
| 8 Tem → tahliye | Alçıtepe hattı | hold | Siper savunması |

### 5. Tümen — Alb. Hasan Askeri *(Eceabat → Kirte)*
| Tarih | Hareket | Tür | Gerekçe |
|---|---|---|---|
| 3 Kas | Eceabat-Maydos | hold | Güney savunma rezervi |
| 25 Nis | Eceabat → Seddülbahir | march | Helles cephesini takviyeye yürüdü |
| 29 Nis | Kirte muharebe hattı | hold | İngiliz/Fransız taarruzlarına direniş |
| 1 Tem → tahliye | Kirte-Alçıtepe | hold | Siper savunması |

### Çanakkale Müstahkem Mevki — Tümg. Cevat Paşa
| Tarih | Hareket | Tür | Gerekçe |
|---|---|---|---|
| 3 Kas → 31 Ara | Kilitbahir/Narrows bataryaları | hold | 18 Mart'ta donanmayı püskürten kıyı topçusu |

---

## İTİLAF KARA / ÇIKARMA KUVVETLERİ

### İngiliz 29. Tümen — Tümg. Hunter-Weston *(Helles)*
| Tarih | Hareket | Tür | Gerekçe |
|---|---|---|---|
| 25 Nis | X/V/W Beach çıkarması | land | River Clyde katliamı |
| 28 Nis | Seddülbahir → Kirte | march | 1. Kirte taarruzu |
| 6 May | Kirte'ye yüklenme | march | 2. Kirte taarruzu (kanlı, sınırlı) |
| 4 Haz | Kirte'ye yüklenme | march | 3. Kirte taarruzu — yine yarma yok |
| 7 Haz → tahliye | Helles köprübaşı | hold | Siper savaşı |

### Fransız Sefer Kuvveti — General d'Amade
| Tarih | Hareket | Tür | Gerekçe |
|---|---|---|---|
| 25 Nis | Kumkale (Asya) | land | Aldatma çıkarması |
| 27 Nis | Kumkale → Morto/Seddülbahir | march | Helles sağ kanada transfer |
| 29 Nis → tahliye | Helles sağ kanat (Kereves Dere) | hold | Fransız sektörü |

### 1. Avustralya Tümeni — Tümg. Bridges *(Arıburnu)*
| Tarih | Hareket | Tür | Gerekçe |
|---|---|---|---|
| 25 Nis | Arıburnu çıkarması | land | Hedefin 1.5 km kuzeyi, 04:30 |
| 27 Nis | "Old Anzac" köprübaşı | hold | 400 Plateau çekişmesi |
| 6 Ağu | Lone Pine (Kanlı Sırt) | march | Aldatma taarruzu |
| 9 Ağu → tahliye | Tutulan zemin | hold | Savunma |

### Yeni Zelanda Tugayı — Alb. Johnston *(ANZAC → Conkbayırı zirvesi → geri)*
| Tarih | Hareket | Tür | Gerekçe |
|---|---|---|---|
| 25 Nis | Arıburnu çıkarması | land | Anzac mevzileri |
| 6 Ağu | Arıburnu → Sarı Bayır | march | Conkbayırı'na gece tırmanışı |
| 8 Ağu | **Conkbayırı zirvesi** | hold | Zirveye ulaşıldı — bir gece tutuldu |
| 10 Ağu | Zirve → Anzac hattı | march | M. Kemal'in karşı taarruzu sürdü |
| 12 Ağu → tahliye | Anzac hattı | hold | Siper savunması |

### İngiliz IX Kolordusu — Korg. Stopford *(Suvla)*
| Tarih | Hareket | Tür | Gerekçe |
|---|---|---|---|
| 6 Ağu | Suvla Koyu çıkarması | land | Düşük dirençle başladı |
| 8 Ağu | Suvla → Anafartalar yönü | march | Geciken ilerleme (komuta tereddüdü, su sıkıntısı) |
| 21 Ağu | Scimitar Hill taarruzu | march | Kampanyanın son büyük hamlesi |
| 23 Ağu → tahliye | Suvla köprübaşı | hold | Taarruz başarısız; savunma |

### SS River Clyde
| Tarih | Hareket | Tür | Gerekçe |
|---|---|---|---|
| 25 Nis | V Beach önü | land | Bilerek oturtulan açık hedef |
| 27 Nis | V Beach | hold | Köprübaşı ağır kayıpla tutuldu |

---

## DENİZ KUVVETLERİ (Boğaz harekâtı — 18 Mart 1915)

> **Artık deniz birimleri de bu tek rehberde (`MOVEMENT_TIMELINE`) keyframe olarak tanımlıdır.** Koordinatlar `position-engine.js` kalibre su-ankrajlarıyla (`MAP_NAVAL_ANCHORS`) ve `historical-map-data.js` naval rotalarıyla hizalıdır; `getNarrativeNavalPosition` önce bu rehberi okur (priority-0 `getHistoricalPlacementForUnit` üzerinden), kapsam dışı günlerde eski prosedürel `ALLIED_NAVAL_LANES` fallback olarak kalır. Render yine `snapToSeaWater` + naval display offset uygular. **Batış sahnesi** base-faz (naval-assault) `outcome:"…battı"` + `kind:'land'` (exact) keyframe'iyle korunur — koordinatı değiştirmek batışı bozmaz. (Boğaz suyu: Erenköy körfezi, x≈1060–1380, y≈2310–2560). 18 Mart sahnesi `FRONT_CAMERA_TARGETS.Deniz` ile Boğaz'a çerçevelenir.

### Nusret Mayın Gemisi (Kolağası Nazmi Bey)
| Tarih | Hareket | Gerekçe |
|---|---|---|
| 3 Kas → 6 Mar | Erenköy/Boğaz devriyesi | Mayın savunması |
| **7/8 Mar gecesi** | Erenköy koyuna paralel 26 mayınlık hat döşeme | 18 Mart'ın kaderini belirleyen gizli hat |
| 9 Mar → | Erenköy/Kephez nöbet hattı | Mayın hattı döşendi |

### İtilaf Donanması (19 Şubat → 18 Mart)
Gemiler Ege'den (GB) Boğaz'a hat halinde yaklaşır (`NAVAL_APPROACH_ROUTE`), her gemi kendi "lane"inde (QE kuzeydoğu amiral hattı, Suffren doğu, Bouvet/Irresistible/Ocean dönüş hattı, trawlerlar uzak batı). **18 Mart günü** Erenköy dönüş hattında Nusret'in mayınlarına çarparlar:
| Gemi | 18 Mart sonu | 
|---|---|
| **Bouvet** (Fransız) | 13:58 mayına çarpıp ~2 dk'da battı (~640 kayıp) — *ertesi gün haritadan kalkar* |
| **HMS Irresistible** | Erenköy mayın hattında devre dışı, battı |
| **HMS Ocean** | Irresistible'ı kurtarmaya çalışırken mayına çarpıp battı |
| **Suffren** (Fransız) | Ağır hasar, sağ kaldı; Boğaz dışına çekildi |
| **HMS Queen Elizabeth** (amiral) | Hasar almadı; Mayıs'ta denizaltı tehdidiyle Ege'ye döndü |
| **Mayın tarama trawlerları** | 45 deneme başarısız; hat açılamadı, taarruz günü görünmedi |

*✅ Konsolidasyon tamam: 7 gemi (Nusret, QE, Suffren, Bouvet, Irresistible, Ocean, trawlerlar) artık `MOVEMENT_TIMELINE`'da kaynaklı keyframe'lerle. Kara + deniz tek koordinat rehberinde.*

### Kaynak doğrulaması (çok-kaynaklı, Haziran 2026)
Gün-gün hareketler çok-ajanlı bir doğrulama akışıyla (Peter Hart 2011, AWM, NZ History/Te Ara, Anzac Portal, TNA, Britannica, Naval-History.net) çapraz kontrol edildi. Uygulanan düzeltmeler: **9. Tümen** = V/W Beach asıl savunucusu (26. Alay; Halil Sami Bey) — bu rol hatalı şekilde 7. Tümen'deydi; **7. Tümen** aslen Saros/Bulair ihtiyatı, Maidos üzerinden güneye (haritada küratöryel olarak güney sektörde tutuluyor); **NZ Tugayı** Conkbayırı zirvesini 8–9 Ağu tuttu, 9 Ağu akşamı İngiliz taburlarına devretti — 10 Ağu'da sürülen onlardı; **Lone Pine** = 1. Avustralya Piyade Tugayı, 6 Ağu 17:30; **29. Tümen** = S/V/W/X/Y beş plaj. Doğrulanan (değişmeyen): 18 Mart batış sırası/saatleri, üç Kirte tarihi (28 Nis / 6–8 May / 4 Haz), tahliye tarihleri (19/20 Ara, 8/9 Oca). Açık tartışmalı nokta (değiştirilmedi): Nusret'in gemi komutanı (Nazmi Bey vs. Tophaneli İsmail Hakkı Bey) — proje mevcut kararını koruyor.

---

## TAHLİYE (Sessiz Çekiliş — Ara 1915 → Oca 1916)

Kampanyanın çözülüşü. Birimler **görünür şekilde** sahil iskelelerine çekilip (geri-çekilme okuyla) sonra harita-dışı olur:
| Tarih | Olay |
|---|---|
| 18-19 Ara | Anzac/NZ birlikleri gece gizlice **North Beach**'e sessiz çekiliş (geri-çekilme oku) |
| 20 Ara | Anzac/Suvla (anzac-1div, nz-inf, kuzey Osmanlı) tahliye tamamlandı — haritadan kalkar |
| 21 Ara | IX. Kolordu (Suvla) tahliye tamamlandı |
| 1-8 Oca | Helles birlikleri (29-div, fr-corps) `helles-final-evacuation` rotasıyla batıya/denize çekilir |
| **9 Oca 1916** | İtilaf yarımadayı tümüyle terk etti — yalnız **5 Osmanlı birimi** kalır (yarımada tutuldu) |

> Off-map zamanlaması `canonical-positions.js` end-state'lerinde (`evacuated`); rehber sadece harita-üstü çekiliş yürüyüşünü tanımlar. NOT: `qa-release-matrix.mjs` belirli günlerde (20 Ara=8, 9 Oca=7 token) görünürlük bekler — değişiklikten sonra `npm run qa` çalıştır.

---

## SİSTEMLER (kamera + animasyon)

- **Kamera (belgesel kararlılığı):** `decoratePhasesForMobile` (phase-engine) sahne carry-forward yapar — sadece major/anchor günler yeniden çerçeveler, minor günler sahneyi tutar. `applyPhaseCamera` (app.js) hedefi **gerçek viewBox**'a karşı deadband ile karşılaştırır (renderMap sıfırlamasına karşı dayanıklı). Deniz dönemi `FRONT_CAMERA_TARGETS.Deniz` ile Boğaz'a sabitlenir.
- **Hareket okları:** `renderUnitMovementTrails` (animation-orchestrator) — bir birim o gün gerçekten yürüdüyse (16–220px) faction-renkli ilerleme oku; `retreat: true` keyframe'lerde soluk **geri-çekilme oku**. Holding/ışınlanma/girişte ok yok.

---

## Yeni birim/hareket eklemek

1. [`src/data/campaign-movement.js`](../src/data/campaign-movement.js) → `MOVEMENT_TIMELINE[unitId]` dizisine kronolojik keyframe ekle.
2. Yer-adı için `place: '<id>'` kullan (koordinat `GEO_LOCATION_BY_ID`'den kalibre gelir); ayrışma gerekiyorsa küçük `dx/dy` ver.
3. Çok-günlük yürüyüş için: `march` keyframe'ini **çıkış** noktasına koy, **varış** noktasını bir sonraki keyframe'e yaz.
4. Geri çekilme/tahliye yürüyüşü için keyframe'e `retreat: true` ekle → soluk geri-çekilme oku çizilir.
5. Bu belgeyi de güncelle ve **`npm run qa`** (full — qa:sectors + qa:map + qa:matrix dahil) ile doğrula. `qa-release-matrix.mjs` belirli kilometre-taşı günlerde tam token görünürlüğü bekler; o günleri bozma.
