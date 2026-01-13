# PCL-Lite — Persona Control Language (Portable Edition)

**PCL-Lite** est le sous-ensemble universel et portable de **Persona Control Language (PCL)**,  
conçu pour fonctionner **dans toutes les interfaces de chat IA** (ChatGPT, Claude, Gemini, DeepSeek, HuggingFace, etc.)  
par simple **copier/coller**, sans plugin, sans outil, sans runtime externe.

> Objectif :  
> Permettre à un utilisateur d’exporter ses personas, teams et workflows depuis une IA,  
> puis de les importer dans une autre, et de continuer à utiliser **exactement les mêmes commandes PCL**.

---

## ✨ Caractéristiques clés

- 🧠 **Gestion de Personas** : activation, coalition, primary, merge, quorum  
- 🔁 **Portabilité inter-chat** : export/import en JSON (`PCLPack`)  
- 🧩 **Workflow inline** : séquence et parallèle en syntaxe légère  
- 🛡 **Gouvernance minimale** : merge modes, conflict priority, gates simples  
- 📦 **Embedded Runtime** : machine d’état simulée dans la conversation  
- 📜 **Standardisé** : EBNF, JSON Schema, Reference Card, RFC  

---

## 🚀 Quick Start (universel)

### 1) Charger le runtime PCL-Lite dans n’importe quel chat

Copie/colle le contenu de :

```
embedded/bootstrap/BOOTSTRAP_FR.md
```

Cela active le **PCL Embedded Runtime** dans la conversation.

---

### 2) Importer un pack de personas

```text
/persona import
{ contenu de packs/pclpack.core.json }
```

---

### 3) Utiliser PCL

```text
/persona ARCHI
/persona +CRITIC +AUDIT merge=dissent
/persona team load DESIGN_REVIEW
/persona workflow SIMPLIFY -> ARCHI -> CRITIC -> AUDIT
/persona status
```

---

### 4) Exporter pour un autre chat

```text
/persona export
```

Résultat : un fichier **PCLPack JSON** portable vers Claude, Gemini, DeepSeek, etc.

---

## 📦 Qu’est-ce qu’un PCLPack ?

Un **PCLPack** est une archive JSON standard contenant :

- Personas  
- Teams  
- Workflows  
- Policies minimales  
- État courant (active set, primary, merge, etc.)  

Schéma officiel :  
```
schemas/pclpack.schema.json
```

---

## 📁 Structure du dépôt

```
pcl-lite/
├─ spec/                # Spécification normative
├─ grammar/             # EBNF du DSL
├─ schemas/             # JSON Schemas (commands, packs, state)
├─ packs/               # PCLPack prêts à importer
├─ embedded/            # Runtime in-chat (bootstrap + state machine)
├─ examples/            # Transcripts multi-plateformes
├─ tools/               # Validateurs et générateurs
└─ README.md
```

---

## 🔌 Compatibilité

| Plateforme | Mode |
|-------------|------|
| ChatGPT | Copy/Paste + Embedded Runtime |
| Claude Desktop | Copy/Paste + Fichier JSON |
| Gemini | Copy/Paste |
| DeepSeek | Copy/Paste |
| HuggingFace Chat | Copy/Paste |
| IDE (via MCP) | Extension future |

---

## 🧠 Relation avec PCL & PML

- **PML (Persona Management Layer)** : plateforme et gouvernance  
- **PCL (Persona Control Language)** : langage complet  
- **PCL-Lite** : profil minimal universel, portable, inter-chat  

Analogie :

| Monde Cloud | Monde Cognitif |
|-------------|----------------|
| Kubernetes | PML |
| kubectl / YAML | PCL |
| Cloud-Init | **PCL-Lite** |

---

## 📜 Spécifications

- `spec/PCL_LITE_SPEC.md` — norme complète  
- `spec/PCLPACK_SPEC.md` — format d’export/import  
- `grammar/pcl-lite.ebnf` — grammaire formelle  
- `schemas/` — contrats machine-readable  

---

## 🛡 Gouvernance & Licence

- Spécification : **CC-BY-4.0**  
- Outils & code : **Apache-2.0**  
- Process RFC ouvert (voir `GOVERNANCE.md`)  

---

## 🌍 Vision

PCL-Lite est la **clé USB cognitive universelle** :

> Tu configures ton système de pensée une fois,  
> tu l’emportes partout,  
> quel que soit le modèle, l’éditeur ou la plateforme.

---

## 🤝 Contribuer

- Voir `CONTRIBUTING.md`  
- Proposer :  
  - nouveaux personas  
  - nouvelles teams  
  - nouveaux packs  
  - améliorations du runtime embarqué  

---

## 🧭 Prochaines étapes

- PCL-Lite v1.0 (stable)  
- Conformance Suite inter-modèles  
- Signature cryptographique des packs  
- Synchronisation cloud (optionnelle)  
- Bridge MCP vers PCL complet / PML  

---

**PCL-Lite** — *The portable cognitive control language for all AI chats.*
