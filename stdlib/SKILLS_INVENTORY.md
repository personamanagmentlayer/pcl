# PCL Standard Library — Skills Inventory

**191 expert skills** across 15 categories.

Generated from the contents of `stdlib/` by
`scripts/generate-skill-inventory.py`. Do not edit by hand — rerun the
script after adding, renaming, or splitting a skill.

---

## Layout

Every skill is a directory holding a `SKILL.md`, grouped by category:

```
stdlib/<category>/<skill-name>/
├── SKILL.md            # entry point, loaded whenever the skill activates
└── references/         # detailed material, read on demand
```

This is the Agent Skills v1.0 layout. `SKILL.md` stays within a 500-line
budget so activation stays cheap; the bulk of each skill lives in
`references/` and is read only when needed (progressive disclosure).

- Skill entry points: **191** (54,054 lines)
- Reference documents: **166** (72,239 lines)

Conformance is enforced by `scripts/validate-skills.py`; the machine-readable
index lives in `stdlib/catalog/`.

---

## Distribution by category

| Category                                  |  Skills | References |
| ----------------------------------------- | ------: | ---------: |
| Business & Technology Domains (`domains`) |      58 |         48 |
| Programming Languages (`languages`)       |      23 |         22 |
| Data & Databases (`data`)                 |      17 |         16 |
| DevOps & Infrastructure (`devops`)        |      16 |         17 |
| Frameworks & Platforms (`frameworks`)     |      15 |         15 |
| Security & Compliance (`security`)        |      12 |         10 |
| Tools & Meta-Programming (`tools`)        |      12 |         11 |
| AI & Machine Learning (`ai`)              |       7 |          6 |
| QA & Testing (`qa`)                       |       7 |          6 |
| APIs & Services (`api`)                   |       6 |          4 |
| Professional Services (`professional`)    |       5 |          0 |
| Cloud Platforms (`cloud`)                 |       4 |          3 |
| Engineering Workflows (`workflows`)       |       4 |          7 |
| Scientific & Research (`scientific`)      |       3 |          0 |
| Design (`design`)                         |       2 |          1 |
| **Total**                                 | **191** |    **166** |

---

## Complete listing

### Business & Technology Domains — `domains/` (58)

|   # | Skill                          | Version | SKILL.md | References                                  |
| --: | ------------------------------ | ------- | -------: | ------------------------------------------- |
|   1 | `5g-expert`                    | 1.1.0   |      175 | EXAMPLES.md (572)                           |
|   2 | `aerospace-expert`             | 1.1.0   |      423 | FLIGHT_MANAGEMENT_SYSTEM.md (358)           |
|   3 | `agtech-expert`                | 1.1.0   |      214 | EXAMPLES.md (618)                           |
|   4 | `automotive-expert`            | 1.1.0   |      422 | FLEET_MANAGEMENT_SYSTEM.md (359)            |
|   5 | `biotech-expert`               | 1.1.0   |      196 | EXAMPLES.md (456)                           |
|   6 | `blockchain-expert`            | 1.1.0   |      419 | —                                           |
|   7 | `business-intelligence-expert` | 1.1.0   |      191 | EXAMPLES.md (715)                           |
|   8 | `cleantech-expert`             | 1.1.0   |      222 | EXAMPLES.md (620)                           |
|   9 | `construction-expert`          | 1.1.0   |      349 | PROJECT_MANAGEMENT_SYSTEM.md (290)          |
|  10 | `customer-support-expert`      | 1.1.0   |      171 | EXAMPLES.md (538)                           |
|  11 | `cybersecurity-expert`         | 1.1.0   |      185 | EXAMPLES.md (658)                           |
|  12 | `dynamics365-expert`           | 1.1.0   |      171 | EXAMPLES.md (547)                           |
|  13 | `e-learning-expert`            | 1.1.0   |      179 | EXAMPLES.md (642)                           |
|  14 | `edge-computing-expert`        | 1.1.0   |      185 | EXAMPLES.md (704)                           |
|  15 | `edtech-expert`                | 1.1.0   |      261 | EXAMPLES.md (552)                           |
|  16 | `education-expert`             | 2.0.0   |      414 | —                                           |
|  17 | `energy-expert`                | 1.1.0   |      484 | SMART_GRID_MONITORING_SYSTEM.md (146)       |
|  18 | `farming-expert`               | 2.0.0   |      411 | —                                           |
|  19 | `finance-expert`               | 2.0.0   |      423 | —                                           |
|  20 | `fintech-expert`               | 1.1.0   |      193 | EXAMPLES.md (531)                           |
|  21 | `gaming-expert`                | 1.1.0   |      179 | EXAMPLES.md (617)                           |
|  22 | `healthcare-expert`            | 2.0.0   |      373 | ELECTRONIC_HEALTH_RECORD_SYSTEM.md (143)    |
|  23 | `healthtech-expert`            | 1.1.0   |      267 | EXAMPLES.md (629)                           |
|  24 | `hospitality-expert`           | 1.1.0   |      366 | PROPERTY_MANAGEMENT_SYSTEM.md (340)         |
|  25 | `hr-tech-expert`               | 1.1.0   |      168 | EXAMPLES.md (493)                           |
|  26 | `insurance-expert`             | 1.1.0   |      425 | POLICY_ADMINISTRATION_SYSTEM.md (303)       |
|  27 | `iot-expert`                   | 1.1.0   |      441 | —                                           |
|  28 | `legaltech-expert`             | 1.1.0   |      386 | EXAMPLES.md (603)                           |
|  29 | `logistics-expert`             | 2.0.0   |      483 | —                                           |
|  30 | `manufacturing-expert`         | 1.1.0   |      488 | MANUFACTURING_EXECUTION_SYSTEM_MES.md (264) |
|  31 | `maritime-expert`              | 1.1.0   |      277 | VESSEL_TRACKING_SYSTEM.md (311)             |
|  32 | `marketing-expert`             | 1.1.0   |      174 | EXAMPLES.md (521)                           |
|  33 | `media-expert`                 | 1.1.0   |      368 | CONTENT_MANAGEMENT_SYSTEM.md (240)          |
|  34 | `metaverse-expert`             | 1.1.0   |      188 | EXAMPLES.md (792)                           |
|  35 | `microsoft365-expert`          | 1.1.0   |      169 | EXAMPLES.md (489)                           |
|  36 | `oracle-expert`                | 1.1.0   |      169 | EXAMPLES.md (407)                           |
|  37 | `pharmaceutical-expert`        | 1.1.0   |      184 | EXAMPLES.md (366)                           |
|  38 | `proptech-expert`              | 1.1.0   |      188 | EXAMPLES.md (578)                           |
|  39 | `quality-management-expert`    | 1.1.0   |      182 | EXAMPLES.md (575)                           |
|  40 | `quantum-algorithms-expert`    | 1.1.0   |      187 | EXAMPLES.md (552)                           |
|  41 | `real-estate-expert`           | 1.1.0   |      428 | PROPERTY_LISTING_SYSTEM.md (375)            |
|  42 | `regtech-expert`               | 1.1.0   |      191 | EXAMPLES.md (615)                           |
|  43 | `retail-expert`                | 1.1.0   |      434 | POINT_OF_SALE_SYSTEM.md (310)               |
|  44 | `robotics-expert`              | 1.1.0   |      185 | EXAMPLES.md (742)                           |
|  45 | `sales-expert`                 | 1.1.0   |      180 | EXAMPLES.md (559)                           |
|  46 | `salesforce-expert`            | 1.1.0   |      170 | EXAMPLES.md (342)                           |
|  47 | `sap-expert`                   | 1.1.0   |      448 | —                                           |
|  48 | `serverless-expert`            | 1.1.0   |      187 | EXAMPLES.md (633)                           |
|  49 | `servicenow-expert`            | 1.1.0   |      483 | —                                           |
|  50 | `sharepoint-expert`            | 1.1.0   |      169 | EXAMPLES.md (462)                           |
|  51 | `social-media-expert`          | 1.1.0   |      177 | EXAMPLES.md (597)                           |
|  52 | `stockbreeder-expert`          | 2.0.0   |      466 | —                                           |
|  53 | `supply-chain-expert`          | 1.1.0   |      180 | EXAMPLES.md (560)                           |
|  54 | `telecommunications-expert`    | 1.1.0   |      442 | NETWORK_MANAGEMENT_SYSTEM.md (288)          |
|  55 | `trading-expert`               | 1.1.0   |      437 | —                                           |
|  56 | `web3-expert`                  | 1.1.0   |      189 | EXAMPLES.md (661)                           |
|  57 | `webassembly-expert`           | 1.1.0   |      186 | EXAMPLES.md (578)                           |
|  58 | `workday-expert`               | 1.1.0   |      171 | EXAMPLES.md (354)                           |

### Programming Languages — `languages/` (23)

|   # | Skill               | Version | SKILL.md | References                                               |
| --: | ------------------- | ------- | -------: | -------------------------------------------------------- |
|   1 | `clojure-expert`    | 1.1.0   |      204 | EXAMPLES.md (572)                                        |
|   2 | `cpp-expert`        | 1.1.0   |      273 | BEST_PRACTICES.md (54), MODERN_C_SYNTAX.md (376)         |
|   3 | `csharp-expert`     | 1.1.0   |      242 | CORE_CONCEPTS.md (788)                                   |
|   4 | `dart-expert`       | 1.1.0   |      500 | —                                                        |
|   5 | `elixir-expert`     | 1.1.0   |      445 | PHOENIX_FRAMEWORK.md (104)                               |
|   6 | `go-expert`         | 1.1.0   |      400 | CORE_CONCEPTS.md (553)                                   |
|   7 | `haskell-expert`    | 1.1.0   |      200 | EXAMPLES.md (546)                                        |
|   8 | `java-expert`       | 1.1.0   |      374 | CORE_CONCEPTS.md (570)                                   |
|   9 | `javascript-expert` | 1.1.0   |      486 | CORE_CONCEPTS.md (280), PATTERNS.md (109)                |
|  10 | `julia-expert`      | 1.1.0   |      179 | EXAMPLES.md (524)                                        |
|  11 | `kotlin-expert`     | 1.1.0   |      401 | —                                                        |
|  12 | `nim-expert`        | 1.1.0   |      173 | EXAMPLES.md (385)                                        |
|  13 | `nodejs-expert`     | 1.1.0   |      154 | CORE_CONCEPTS.md (704)                                   |
|  14 | `pcl-expert`        | 1.1.0   |      465 | BEST_PRACTICES.md (64), CORE_CONCEPTS.md (395)           |
|  15 | `php-expert`        | 1.1.0   |      306 | LARAVEL_FRAMEWORK.md (414), MODERN_PHP_8_SYNTAX.md (279) |
|  16 | `python-expert`     | 1.1.0   |      375 | CORE_CONCEPTS.md (468)                                   |
|  17 | `r-expert`          | 1.1.0   |      437 | —                                                        |
|  18 | `ruby-expert`       | 1.1.0   |      464 | RUBY_ON_RAILS.md (294)                                   |
|  19 | `rust-expert`       | 1.1.0   |      361 | CORE_CONCEPTS.md (676)                                   |
|  20 | `scala-expert`      | 1.1.0   |      425 | —                                                        |
|  21 | `swift-expert`      | 1.1.0   |      439 | SWIFT_SYNTAX.md (216)                                    |
|  22 | `typescript-expert` | 1.1.0   |      356 | PATTERNS.md (165)                                        |
|  23 | `zig-expert`        | 1.1.0   |      479 | —                                                        |

### Data & Databases — `data/` (17)

|   # | Skill                         | Version | SKILL.md | References                                              |
| --: | ----------------------------- | ------- | -------: | ------------------------------------------------------- |
|   1 | `airflow-expert`              | 1.1.0   |      147 | CORE_CONCEPTS.md (770)                                  |
|   2 | `analytical-databases-expert` | 1.0.0   |      274 | MODELLING.md (222)                                      |
|   3 | `data-mesh-expert`            | 1.1.0   |      141 | CORE_CONCEPTS.md (914)                                  |
|   4 | `databricks-expert`           | 1.1.0   |      143 | CORE_CONCEPTS.md (636)                                  |
|   5 | `dbt-expert`                  | 1.1.0   |      136 | CORE_CONCEPTS.md (853)                                  |
|   6 | `elasticsearch-expert`        | 2.0.0   |      189 | —                                                       |
|   7 | `kafka-expert`                | 1.1.0   |      127 | —                                                       |
|   8 | `looker-expert`               | 1.1.0   |      161 | CORE_CONCEPTS.md (805)                                  |
|   9 | `mongodb-expert`              | 1.1.0   |      110 | CORE_CONCEPTS.md (596)                                  |
|  10 | `mysql-expert`                | 1.0.0   |      293 | OPERATIONS.md (242)                                     |
|  11 | `postgresql-expert`           | 1.1.0   |      109 | CORE_CONCEPTS.md (705)                                  |
|  12 | `powerbi-expert`              | 1.1.0   |      149 | CORE_CONCEPTS.md (758)                                  |
|  13 | `redis-expert`                | 1.1.0   |      284 | BEST_PRACTICES.md (61), NODE_JS_CLIENT_IOREDIS.md (428) |
|  14 | `snowflake-expert`            | 1.1.0   |      139 | CORE_CONCEPTS.md (606)                                  |
|  15 | `sql-expert`                  | 1.1.0   |      125 | CORE_CONCEPTS.md (769)                                  |
|  16 | `stream-processing-expert`    | 1.0.0   |      310 | OPERATIONS.md (225)                                     |
|  17 | `tableau-expert`              | 1.1.0   |      135 | CORE_CONCEPTS.md (669)                                  |

### DevOps & Infrastructure — `devops/` (16)

|   # | Skill                | Version | SKILL.md | References                                                  |
| --: | -------------------- | ------- | -------: | ----------------------------------------------------------- |
|   1 | `ansible-expert`     | 1.1.0   |      445 | BEST_PRACTICES.md (100), PLAYBOOKS.md (192), ROLES.md (124) |
|   2 | `argocd-expert`      | 1.1.0   |      246 | CORE_CONCEPTS.md (536)                                      |
|   3 | `cicd-expert`        | 1.1.0   |      313 | GITHUB_ACTIONS.md (329), JENKINS.md (243)                   |
|   4 | `devops-expert`      | 2.0.0   |      497 | —                                                           |
|   5 | `docker-expert`      | 1.1.0   |      370 | PATTERNS.md (255)                                           |
|   6 | `grafana-expert`     | 1.1.0   |      197 | CORE_CONCEPTS.md (721)                                      |
|   7 | `helm-expert`        | 1.1.0   |      268 | CORE_CONCEPTS.md (502)                                      |
|   8 | `istio-expert`       | 1.1.0   |      205 | CORE_CONCEPTS.md (563)                                      |
|   9 | `kubernetes-expert`  | 1.1.0   |      324 | CORE_CONCEPTS.md (708)                                      |
|  10 | `linkerd-expert`     | 1.1.0   |      222 | CORE_CONCEPTS.md (524)                                      |
|  11 | `monitoring-expert`  | 1.1.0   |      455 | APPLICATION_INSTRUMENTATION.md (177), PROMETHEUS.md (278)   |
|  12 | `nginx-expert`       | 1.1.0   |      117 | CORE_CONCEPTS.md (684)                                      |
|  13 | `performance-expert` | 2.0.0   |      474 | —                                                           |
|  14 | `prometheus-expert`  | 1.1.0   |      223 | CORE_CONCEPTS.md (535)                                      |
|  15 | `sre-expert`         | 2.0.0   |      482 | —                                                           |
|  16 | `terraform-expert`   | 1.1.0   |      241 | CORE_CONCEPTS.md (806)                                      |

### Frameworks & Platforms — `frameworks/` (15)

|   # | Skill                 | Version | SKILL.md | References                                         |
| --: | --------------------- | ------- | -------: | -------------------------------------------------- |
|   1 | `android-expert`      | 1.1.0   |      206 | EXAMPLES.md (544)                                  |
|   2 | `angular-expert`      | 1.1.0   |      195 | EXAMPLES.md (801)                                  |
|   3 | `django-expert`       | 1.1.0   |      421 | —                                                  |
|   4 | `electron-expert`     | 1.1.0   |      210 | EXAMPLES.md (557)                                  |
|   5 | `flask-expert`        | 1.1.0   |      477 | REST_API_WITH_FLASK_RESTFUL.md (116)               |
|   6 | `flutter-expert`      | 1.1.0   |      205 | EXAMPLES.md (325)                                  |
|   7 | `ios-expert`          | 1.1.0   |      222 | EXAMPLES.md (459)                                  |
|   8 | `nextjs-expert`       | 1.1.0   |      185 | EXAMPLES.md (738)                                  |
|   9 | `react-expert`        | 1.1.0   |      189 | CORE_CONCEPTS.md (760)                             |
|  10 | `react-native-expert` | 1.1.0   |      225 | EXAMPLES.md (443)                                  |
|  11 | `remix-expert`        | 1.1.0   |      195 | EXAMPLES.md (790)                                  |
|  12 | `spring-boot-expert`  | 1.1.0   |      424 | SPRING_SECURITY_WITH_JWT.md (144), TESTING.md (96) |
|  13 | `svelte-expert`       | 1.1.0   |      187 | EXAMPLES.md (710)                                  |
|  14 | `tauri-expert`        | 1.1.0   |      213 | EXAMPLES.md (547)                                  |
|  15 | `vue-expert`          | 1.1.0   |      184 | EXAMPLES.md (729)                                  |

### Security & Compliance — `security/` (12)

|   # | Skill                          | Version | SKILL.md | References                                                                   |
| --: | ------------------------------ | ------- | -------: | ---------------------------------------------------------------------------- |
|   1 | `audit-expert`                 | 1.1.0   |      194 | COMPLIANCE_AUDITING.md (381), SECURITY_CODE_REVIEW.md (320)                  |
|   2 | `codeql-expert`                | 1.1.0   |      251 | —                                                                            |
|   3 | `cryptography-expert`          | 1.1.0   |      195 | EXAMPLES.md (460)                                                            |
|   4 | `gdpr-expert`                  | 1.1.0   |      392 | —                                                                            |
|   5 | `identity-access-expert`       | 1.0.0   |      305 | PATTERNS.md (296)                                                            |
|   6 | `incident-response-expert`     | 1.1.0   |      108 | —                                                                            |
|   7 | `penetration-testing-expert`   | 1.1.0   |      205 | EXAMPLES.md (370)                                                            |
|   8 | `secrets-management-expert`    | 1.0.0   |      319 | ENCRYPTION.md (214)                                                          |
|   9 | `security-expert`              | 1.1.0   |      350 | AUTHENTICATION_AUTHORIZATION.md (235), OWASP_TOP_10_VULNERABILITIES.md (230) |
|  10 | `soc2-expert`                  | 1.1.0   |      400 | —                                                                            |
|  11 | `supply-chain-security-expert` | 1.0.0   |      339 | RESPONSE.md (200)                                                            |
|  12 | `zero-trust-expert`            | 1.1.0   |      191 | EXAMPLES.md (588)                                                            |

### Tools & Meta-Programming — `tools/` (12)

|   # | Skill                        | Version | SKILL.md | References                        |
| --: | ---------------------------- | ------- | -------: | --------------------------------- |
|   1 | `browser-automation-expert`  | 1.0.0   |      309 | RECIPES.md (243)                  |
|   2 | `code-review-expert`         | 1.1.0   |      339 | REVIEW_GUIDELINES.md (186)        |
|   3 | `discord-expert`             | 1.1.0   |      170 | EXAMPLES.md (427)                 |
|   4 | `document-processing-expert` | 1.0.0   |      296 | LIBRARIES.md (243)                |
|   5 | `git-expert`                 | 1.1.0   |      177 | CORE_CONCEPTS.md (574)            |
|   6 | `skill-creator-expert`       | 1.1.0   |      271 | SKILL_CREATION_FRAMEWORK.md (606) |
|   7 | `skill-router`               | 1.0.0   |      202 | —                                 |
|   8 | `slack-expert`               | 1.1.0   |      169 | EXAMPLES.md (448)                 |
|   9 | `teams-expert`               | 1.1.0   |      168 | EXAMPLES.md (370)                 |
|  10 | `testing-expert`             | 1.1.0   |      252 | CORE_CONCEPTS.md (841)            |
|  11 | `video-streaming-expert`     | 1.1.0   |      172 | EXAMPLES.md (537)                 |
|  12 | `webrtc-expert`              | 1.1.0   |      169 | EXAMPLES.md (540)                 |

### AI & Machine Learning — `ai/` (7)

|   # | Skill                      | Version | SKILL.md | References                                          |
| --: | -------------------------- | ------- | -------: | --------------------------------------------------- |
|   1 | `agent-engineering-expert` | 1.0.0   |      292 | ORCHESTRATION.md (231), SECURITY.md (241)           |
|   2 | `ai-architect-expert`      | 1.1.0   |      393 | —                                                   |
|   3 | `ai-engineer-expert`       | 1.1.0   |      459 | —                                                   |
|   4 | `data-science-expert`      | 1.1.0   |      408 | —                                                   |
|   5 | `llm-engineering-expert`   | 1.0.0   |      278 | EVALUATION.md (186), PROMPT_PATTERNS.md (213)       |
|   6 | `ml-expert`                | 1.1.0   |      371 | —                                                   |
|   7 | `rag-expert`               | 1.0.0   |      290 | ADVANCED_RETRIEVAL.md (185), VECTOR_STORES.md (148) |

### QA & Testing — `qa/` (7)

|   # | Skill                      | Version | SKILL.md | References        |
| --: | -------------------------- | ------- | -------: | ----------------- |
|   1 | `chaos-engineering-expert` | 1.1.0   |      169 | EXAMPLES.md (386) |
|   2 | `cypress-expert`           | 1.1.0   |      169 | EXAMPLES.md (463) |
|   3 | `jest-expert`              | 1.1.0   |      168 | EXAMPLES.md (607) |
|   4 | `load-testing-expert`      | 1.1.0   |      168 | EXAMPLES.md (364) |
|   5 | `playwright-expert`        | 1.1.0   |      169 | EXAMPLES.md (424) |
|   6 | `qa-expert`                | 2.0.0   |      445 | —                 |
|   7 | `selenium-expert`          | 1.1.0   |      169 | EXAMPLES.md (418) |

### APIs & Services — `api/` (6)

|   # | Skill                  | Version | SKILL.md | References                                                                    |
| --: | ---------------------- | ------- | -------: | ----------------------------------------------------------------------------- |
|   1 | `api-design-expert`    | 1.1.0   |      492 | —                                                                             |
|   2 | `fastapi-expert`       | 1.1.0   |      299 | —                                                                             |
|   3 | `graphql-expert`       | 1.1.0   |      226 | BEST_PRACTICES.md (60), MODERN_GRAPHQL_DEVELOPMENT.md (626), PATTERNS.md (57) |
|   4 | `grpc-expert`          | 1.1.0   |      434 | —                                                                             |
|   5 | `microservices-expert` | 1.1.0   |      498 | —                                                                             |
|   6 | `openapi-expert`       | 1.1.0   |      185 | BASIC_OPENAPI_SPECIFICATION.md (337)                                          |

### Professional Services — `professional/` (5)

|   # | Skill               | Version | SKILL.md | References |
| --: | ------------------- | ------- | -------: | ---------- |
|   1 | `accountant-expert` | 1.1.0   |      352 | —          |
|   2 | `banking-expert`    | 1.1.0   |      301 | —          |
|   3 | `finops-expert`     | 2.0.0   |      410 | —          |
|   4 | `lawyer-expert`     | 1.1.0   |      327 | —          |
|   5 | `standards-expert`  | 1.1.0   |      468 | —          |

### Cloud Platforms — `cloud/` (4)

|   # | Skill               | Version | SKILL.md | References                                                  |
| --: | ------------------- | ------- | -------: | ----------------------------------------------------------- |
|   1 | `aws-expert`        | 1.1.0   |      176 | CORE_CONCEPTS.md (559)                                      |
|   2 | `azure-expert`      | 1.1.0   |      177 | —                                                           |
|   3 | `cloudflare-expert` | 1.1.0   |      426 | DURABLE_OBJECTS.md (95), REQUEST_RESPONSE_HANDLING.md (117) |
|   4 | `gcp-expert`        | 1.1.0   |      190 | —                                                           |

### Engineering Workflows — `workflows/` (4)

|   # | Skill                  | Version | SKILL.md | References                                     |
| --: | ---------------------- | ------- | -------: | ---------------------------------------------- |
|   1 | `code-review-workflow` | 1.0.0   |      229 | CHECKLISTS.md (147)                            |
|   2 | `debugging-workflow`   | 1.0.0   |      279 | PRODUCTION.md (209), TOOLKIT.md (212)          |
|   3 | `refactoring-workflow` | 1.0.0   |      240 | LARGE_SCALE.md (183), TRANSFORMATIONS.md (235) |
|   4 | `tdd-workflow`         | 1.0.0   |      237 | EXAMPLES.md (268), LEGACY_CODE.md (186)        |

### Scientific & Research — `scientific/` (3)

|   # | Skill               | Version | SKILL.md | References |
| --: | ------------------- | ------- | -------: | ---------- |
|   1 | `biological-expert` | 1.1.0   |      375 | —          |
|   2 | `quantum-expert`    | 1.1.0   |      343 | —          |
|   3 | `research-expert`   | 1.1.0   |      390 | —          |

### Design — `design/` (2)

|   # | Skill                  | Version | SKILL.md | References          |
| --: | ---------------------- | ------- | -------: | ------------------- |
|   1 | `accessibility-expert` | 1.0.0   |      357 | COMPONENTS.md (337) |
|   2 | `design-expert`        | 1.1.0   |      352 | —                   |

---

## Maintenance

```bash
python scripts/validate-skills.py          # conformance gate
python scripts/split-skill-references.py   # enforce the SKILL.md budget
python scripts/generate-skill-catalog.py   # rebuild stdlib/catalog/
python scripts/generate-skill-inventory.py # rebuild this file
```

**Last generated:** 2026-09-05
