/* eslint-disable no-undef */
jest.mock("../helper/index.js", () => {
  const OriginalTestHelper = jest.requireActual("../helper/index.js");
  return OriginalTestHelper;
});

// eslint-disable-next-line import/first
import TestHelper from "../helper/index.js"

const username1 = "username1"
// const username2 = "username2"

const shard1 = "shard1"
// const shard2 = "shard2"

const room1 = "room1"
// const room2 = "room2"


const testHelper1 = new TestHelper(username1, shard1, room1, "owned")

describe("Owned data type process check", () => {
  describe("First tick only", () => {
    describe("Count totals correctly", () => {
      it('should count creep totals correctly', async () => {
        for (let i = 1; i <= 10; i += 1) {
          const settings = []
          for (let j = 0; j < i; j += 1) {
            settings.push({ type: TestHelper.dataTypes.creep })
          }

          const data = await testHelper1.process(settings)
          const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.totals.creeps).toBe(i)
        }
      })
      it('should count structures totals correctly', async () => {
        for (let i = 1; i <= 10; i += 1) {
          let settings = []
          for (let j = 0; j < i; j += 1) {
            settings.push({ type: TestHelper.dataTypes.spawn })
          }

          let data = await testHelper1.process(settings)
          let base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.totals.structures).toBe(i)

          settings = [
            { type: TestHelper.dataTypes.road },
            { type: TestHelper.dataTypes.rampart },
            { type: TestHelper.dataTypes.constructedWall },
            { type: TestHelper.dataTypes.spawn },
            { type: TestHelper.dataTypes.extension },
            { type: TestHelper.dataTypes.link },
            { type: TestHelper.dataTypes.storage },
            { type: TestHelper.dataTypes.tower },
            { type: TestHelper.dataTypes.observer },
            { type: TestHelper.dataTypes.powerSpawn },
            { type: TestHelper.dataTypes.extractor },
            { type: TestHelper.dataTypes.lab },
            { type: TestHelper.dataTypes.terminal },
            { type: TestHelper.dataTypes.container },
            { type: TestHelper.dataTypes.nuker },
          ]

          data = await testHelper1.process(settings)
          base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.totals.structures).toBe(settings.length)
        }
      })
      it('should count constructionSites totals correctly', async () => {
        for (let i = 1; i <= 10; i += 1) {
          const settings = []
          for (let j = 0; j < i; j += 1) {
            settings.push({ type: TestHelper.dataTypes.constructionSite })
          }

          const data = await testHelper1.process(settings)
          const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.totals.constructionSites).toBe(i)
        }
      })
      it('should count resourcesStored totals correctly', async () => {
        for (let i = 1; i <= 10; i += 1) {
          const settings = []
          for (let j = 0; j < i; j += 1) {
            settings.push({ type: TestHelper.dataTypes.creep, data: { 0: { store: { energy: 100 } } } })
            settings.push({ type: TestHelper.dataTypes.storage, data: { 0: { store: { energy: 100 } } } })
          }

          const data = await testHelper1.process(settings)
          const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.totals.resourcesStored).toBe(i * 200)
        }
      })
      it('should count minerals totals correctly', async () => {
        for (let i = 1; i <= 10; i += 1) {
          const settings = []
          for (let j = 0; j < i; j += 1) {
            settings.push({ type: TestHelper.dataTypes.mineral, data: { 0: { amount: 100 } } })
          }

          const data = await testHelper1.process(settings)
          const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.totals.minerals).toBe(i * 100)
        }
      })
      it('should count room totals correctly', async () => {
        for (let i = 1; i <= 10; i += 1) {
          const data = await testHelper1.process([])
          const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.totals.rooms.owned).toBe(1)
        }
      })
    })
    describe("should count type totals correctly", () => {
      it('should count creepParts totals correctly', async () => {
        const types = ['move', 'work', 'carry', "attack", "ranged_attack", "heal", "claim"]
        const settings = []
        for (let j = 0; j < 5; j += 1) {
          settings.push({
            type: TestHelper.dataTypes.creep, data: {
              0: {
                body: types.reduce((acc, type) => {
                  acc.push({
                    type, hits: 100
                  })
                  return acc;
                }, [])
              }
            }
          })
        }

        const data = await testHelper1.process(settings)
        const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
        for (let i = 0; i < types.length; i += 1) {
          const type = types[i];
          expect(base.countByType.creepParts[type]).toBe(5)
        }
      })
      it('should count intent totals correctly', async () => {
        const types = ['harvest', 'upgradeController', 'repair', 'build'
          , 'heal', 'attack', 'rangedAttack', 'rangedMassAttack', 'dismantle']
        const settings = []
        for (let j = 0; j < 5; j += 1) {
          settings.push({
            type: TestHelper.dataTypes.creep, data: {
              0: {
                actionLog: {
                  harvest: {
                  },
                  dismantle: {
                  },
                  repair: {
                  },
                  build: {
                  },
                  upgradeController: {
                  },
                  attack: {
                  },
                  rangedAttack: {
                  },
                  rangedMassAttack: {
                  },
                  heal: {
                  },
                  rangedHeal: {
                  }
                },
                body: [
                  {
                    "type": "move",
                    "hits": 100
                  },
                  {
                    "type": "work",
                    "hits": 100
                  },
                  {
                    "type": "work",
                    "hits": 100
                  },
                  {
                    "type": "attack",
                    "hits": 100
                  },
                  {
                    "type": "ranged_attack",
                    "hits": 100
                  },
                  {
                    "type": "claim",
                    "hits": 100
                  },
                  {
                    "type": "heal",
                    "hits": 100
                  },
                ]
              },
            }
          })
        }

        const data = await testHelper1.process(settings)
        const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
        for (let i = 0; i < types.length; i += 1) {
          const type = types[i];
          expect(base.countByType.intents[type]).toBe(5)
        }
      })
      it('should count move intent totals correctly', async () => {
        const settings = []
        for (let j = 0; j < 100; j += 1) {
          settings.push({
            type: TestHelper.dataTypes.creep, data: {
              0: {
                x: 0,
                y: 0,
              },
              1: {
                x: 1,
                y: 1,
              },
              5: {
                x: 2,
                y: 1,
              },
            }
          })
        }

        const data = await testHelper1.process(settings)
        const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
        expect(base.countByType.intents.move).toBe(2)
      })
      it('should count structures totals correctly', async () => {
        const types =
          ['road', 'rampart', 'constructedWall', 'spawn', 'extension', 'link', 'storage', 'tower', 'observer',
            'powerSpawn', 'extractor', 'lab', 'terminal', 'container', 'nuker']
        const settings = []
        for (let j = 0; j < 5; j += 1) {
          for (let i = 0; i < types.length; i += 1) {
            const type = types[i];
            settings.push({ type: TestHelper.dataTypes[type] })
          }
        }

        const data = await testHelper1.process(settings)
        const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
        for (let i = 0; i < types.length; i += 1) {
          const type = types[i];
          expect(base.countByType.structures[type]).toBe(5)
        }
      })
      it('should count constructionSites totals correctly', async () => {
        const types =
          ['road', 'rampart', 'constructedWall', 'spawn', 'extension', 'link', 'storage', 'tower', 'observer',
            'powerSpawn', 'extractor', 'lab', 'terminal', 'container', 'nuker']
        const settings = []
        for (let j = 0; j < 5; j += 1) {
          for (let i = 0; i < types.length; i += 1) {
            const structureType = types[i];
            settings.push({ type: TestHelper.dataTypes.constructionSite, data: { 0: { structureType } } })
          }
        }

        const data = await testHelper1.process(settings)
        const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
        for (let i = 0; i < types.length; i += 1) {
          const type = types[i];
          expect(base.countByType.constructionSites[type]).toBe(5)
        }
      })
    })
    describe("should handle construction correctly", () => {
      it('should handle progressPercentage correctly', async () => {
        const types =
          ['road', 'rampart', 'constructedWall', 'spawn', 'extension', 'link', 'storage', 'tower', 'observer',
            'powerSpawn', 'extractor', 'lab', 'terminal', 'container', 'nuker']
        for (let p = 0; p < 100; p += 1) {
          const settings = []
          for (let i = 0; i < types.length; i += 1) {
            const structureType = types[i];
            settings.push(
              {
                type: TestHelper.dataTypes.constructionSite,
                data: { 0: { structureType, progress: p, progressTotal: 100 } }
              })
          }

          const data = await testHelper1.process(settings)
          const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.constructionSites.progressPercentage).toBe(p / 100)
        }
      })
      it('should handle progressNeeded correctly', async () => {
        const types =
          ['road', 'rampart', 'constructedWall', 'spawn', 'extension', 'link', 'storage', 'tower', 'observer',
            'powerSpawn', 'extractor', 'lab', 'terminal', 'container', 'nuker']
        for (let p = 0; p < 100; p += 1) {
          const settings = []
          for (let i = 0; i < types.length; i += 1) {
            const structureType = types[i];
            settings.push(
              {
                type: TestHelper.dataTypes.constructionSite,
                data: { 0: { structureType, progress: p, progressTotal: 100 } }
              })
          }

          const data = await testHelper1.process(settings)
          const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.constructionSites.progressNeeded).toBe((100 - p) * types.length)
        }
      })
    })
    describe("should handle resourcesStored & minerals correctly", () => {
      it('should count resource totals correctly', async () => {
        const types =
          ['power', 'energy', 'H', 'O', 'U', 'K', 'L', 'Z', 'X']
        for (let p = 0; p < 10 * 1000; p += 1000) {
          const settings = []
          settings.push(
            {
              type: TestHelper.dataTypes.storage,
              data: {
                0: {
                  store: types.reduce((acc, type) => {
                    acc[type] = p
                    return acc;
                  }, {})
                }
              }
            })
          settings.push(
            {
              type: TestHelper.dataTypes.link,
              data: {
                0: {
                  store: types.reduce((acc, type) => {
                    acc[type] = p
                    return acc;
                  }, {})
                }
              }
            })
          settings.push(
            {
              type: TestHelper.dataTypes.container,
              data: {
                0: {
                  store: types.reduce((acc, type) => {
                    acc[type] = p
                    return acc;
                  }, {})
                }
              }
            })
          settings.push(
            {
              type: TestHelper.dataTypes.terminal,
              data: {
                0: {
                  store: types.reduce((acc, type) => {
                    acc[type] = p
                    return acc;
                  }, {})
                }
              }
            })

          const data = await testHelper1.process(settings)
          const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          for (let i = 0; i < types.length; i += 1) {
            const type = types[i];
            expect(base.resourcesStored[type]).toBe(p * 4)
          }
        }
      })
      it("should count mineral totals correctly", async () => {
        const types =
          ['H', 'O', 'U', 'K', 'L', 'Z', 'X']
        for (let mc = 0; mc < 100; mc += 10) {
          const settings = []
          for (let i = 0; i < types.length; i += 1) {
            const mineralType = types[i];
            settings.push(
              {
                type: TestHelper.dataTypes.mineral,
                data: { 0: { mineralType, mineralAmount: mc } }
              })
          }

          const data = await testHelper1.process(settings)
          const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          for (let i = 0; i < types.length; i += 1) {
            const type = types[i];
            expect(base.minerals[type]).toBe(mc)
          }
        }
      })
    })
    describe('should handle controller correctly', () => {
      it("should handle level correctly", async () => {
        for (let i = 1; i <= 10; i += 1) {
          const settings = [{
            type: TestHelper.dataTypes.controller, data: {
              0: { level: i }
            }
          }]

          const data = await testHelper1.process(settings)
          const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.controller.level).toBe(i)
        }
      })
      it("should handle progress correctly", async () => {
        for (let i = 1; i <= 10; i += 1) {
          let settings = [{
            type: TestHelper.dataTypes.controller, data: {
              0: { progress: i, level: 1 }
            }
          }]

          let data = await testHelper1.process(settings)
          let base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.controller.progress).toBe(i)

          settings = [{
            type: TestHelper.dataTypes.controller, data: {
              0: { progress: i, level: 8 }
            }
          }]

          data = await testHelper1.process(settings)
          base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.controller.progress).toBe(0)
        }
      })
      it("should handle progress combined correctly", async () => {
        const combinedRCLByLevel = [0, 0, 200, 45200, 180200, 585200, 1800200, 5445200, 16380200];
        for (let i = 1; i <= 8; i += 1) {
          const settings = [{
            type: TestHelper.dataTypes.controller, data: {
              0: { progress: 0, level: i }
            }
          }]

          const data = await testHelper1.process(settings)
          const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.controller.progressCombined).toBe(combinedRCLByLevel[i])
        }
      })
      it("should handle progressTotal correctly", async () => {
        for (let i = 1; i <= 10; i += 1) {
          let settings = [{
            type: TestHelper.dataTypes.controller, data: {
              0: { progressTotal: i, level: 1 }
            }
          }]

          let data = await testHelper1.process(settings)
          let base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.controller.progressTotal).toBe(i)

          settings = [{
            type: TestHelper.dataTypes.controller, data: {
              0: { progressTotal: i, level: 8 }
            }
          }]

          data = await testHelper1.process(settings)
          base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.controller.progressTotal).toBe(0)
        }
      })
      it("should handle safeModeAvailable correctly", async () => {
        for (let i = 1; i <= 10; i += 1) {
          const settings = [{
            type: TestHelper.dataTypes.controller, data: {
              0: { safeModeAvailable: i }
            }
          }]

          const data = await testHelper1.process(settings)
          const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.controller.safeModeAvailable).toBe(i)
        }
      })

      it("should handle ticksToDowngrade correctly", async () => {
        for (let i = 1; i <= 10; i += 1) {
          const settings = [{
            type: TestHelper.dataTypes.controller, data: {
              0: { ticksToDowngrade: i }
            }
          }]

          const data = await testHelper1.process(settings)
          const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.controller.ticksToDowngrade).toBe(i)
        }
      })
    })
    describe('should handle spawning correctly', () => {
      describe('with extensions and spawns', () => {
        it('should count storedSpawningEnergy correctly', async () => {
          for (let p = 0; p < 10 * 1000; p += 1000) {
            const settings = []
            for (let s = 0; s < 10; s += 1) {
              settings.push(
                {
                  type: TestHelper.dataTypes.spawn,
                  data: {
                    0: {
                      store: {
                        energy: p
                      }
                    }
                  }
                })
              settings.push(
                {
                  type: TestHelper.dataTypes.extension,
                  data: {
                    0: {
                      store: {
                        energy: p
                      }
                    }
                  }
                })
            }

            const data = await testHelper1.process(settings)
            const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
            expect(base.spawning.storedSpawningEnergy).toBe(p * 20)
          }
        })
        it('should count storedSpawningEnergy', async () => {
          for (let p = 0; p < 10 * 1000; p += 1000) {
            const settings = []
            for (let s = 0; s < 10; s += 1) {
              settings.push(
                {
                  type: TestHelper.dataTypes.spawn,
                  data: {
                    0: {
                      storeCapacityResource: {
                        energy: p
                      }
                    }
                  }
                })
              settings.push(
                {
                  type: TestHelper.dataTypes.extension,
                  data: {
                    0: {
                      storeCapacityResource: {
                        energy: p
                      }
                    }
                  }
                })
            }

            const data = await testHelper1.process(settings)
            const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
            expect(base.spawning.capacitySpawningEnergy).toBe(p * 20)
          }
        })
      })
      describe('with extensions', () => {
        it('should count storedSpawningEnergy correctly', async () => {
          for (let p = 0; p < 10 * 1000; p += 1000) {
            const settings = []
            for (let s = 0; s < 10; s += 1) {
              settings.push(
                {
                  type: TestHelper.dataTypes.extension,
                  data: {
                    0: {
                      store: {
                        energy: p
                      }
                    }
                  }
                })
            }

            const data = await testHelper1.process(settings)
            const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
            expect(base.spawning.storedSpawningEnergy).toBe(p * 10)
          }
        })
        it('should count storedSpawningEnergy', async () => {
          for (let p = 0; p < 10 * 1000; p += 1000) {
            const settings = []
            for (let s = 0; s < 10; s += 1) {
              settings.push(
                {
                  type: TestHelper.dataTypes.extension,
                  data: {
                    0: {
                      storeCapacityResource: {
                        energy: p
                      }
                    }
                  }
                })
            }

            const data = await testHelper1.process(settings)
            const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
            expect(base.spawning.capacitySpawningEnergy).toBe(p * 10)
          }
        })
      })
      describe('with spawns', () => {
        it('should count storedSpawningEnergy correctly', async () => {
          for (let p = 0; p < 10 * 1000; p += 1000) {
            const settings = []
            for (let s = 0; s < 10; s += 1) {
              settings.push(
                {
                  type: TestHelper.dataTypes.spawn,
                  data: {
                    0: {
                      store: {
                        energy: p
                      }
                    }
                  }
                })
            }

            const data = await testHelper1.process(settings)
            const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
            expect(base.spawning.storedSpawningEnergy).toBe(p * 10)
          }
        })
        it('should count storedSpawningEnergy', async () => {
          for (let p = 0; p < 10 * 1000; p += 1000) {
            const settings = []
            for (let s = 0; s < 10; s += 1) {
              settings.push(
                {
                  type: TestHelper.dataTypes.spawn,
                  data: {
                    0: {
                      storeCapacityResource: {
                        energy: p
                      }
                    }
                  }
                })
            }

            const data = await testHelper1.process(settings)
            const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
            expect(base.spawning.capacitySpawningEnergy).toBe(p * 10)
          }
        })
      })

    })
    it('should handle structureHits correctly', async () => {
      const types =
        ['road', 'rampart', 'constructedWall', 'spawn', 'extension', 'link', 'storage', 'tower', 'observer',
          'powerSpawn', 'extractor', 'lab', 'terminal', 'container', 'nuker',]
      for (let h = 0; h < 100; h += 1) {
        const settings = []
        for (let i = 0; i < types.length; i += 1) {
          const structureType = types[i];
          settings.push(
            {
              type: TestHelper.dataTypes[structureType],
              data: { 0: { hits: h } }
            })
        }

        const data = await testHelper1.process(settings)
        const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
        for (let i = 0; i < types.length; i += 1) {
          const type = types[i];
          expect(base.structureHits[type]).toBe(h)
        }
      }
    })
  })
  describe("Every tick", () => {
    describe('should handle controller rclPerTick correctly', () => {
      it('should handle static non changing values', async () => {
        for (let i = 1; i <= 10; i += 1) {
          const settings = [{
            type: TestHelper.dataTypes.controller, data: {
              1: {
                _upgraded: i
              }
            }
          }]

          const data = await testHelper1.process(settings)
          const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.controller.rclPerTick).toBe(Math.round(i * 0.99 * 100) / 100)
        }
      })
      it('should handle fluctuating values', async () => {
        for (let i = 1; i <= 10; i += 1) {
          const settings = [{
            type: TestHelper.dataTypes.controller, data: {
              0: {
                _upgraded: i
              },
              25: {
                _upgraded: i * 0.75
              },
              50: {
                _upgraded: i * 0.5
              },
              75: {
                _upgraded: null
              }
            }
          }]

          const data = await testHelper1.process(settings)
          const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
          expect(base.controller.rclPerTick).toBe(i * 0.5625)
        }
      })
    })
    it('should handle intentCategories correctly', async () => {
      const settings = []
      for (let i = 1; i <= 10; i += 1) {
        settings.push({
          type: TestHelper.dataTypes.creep, data: {
            0: {
              actionLog: {
                harvest: {
                },
                dismantle: {
                },
                repair: {
                },
                build: {
                },
                upgradeController: {
                },
                attack: {
                },
                rangedAttack: {
                },
                rangedMassAttack: {
                },
                heal: {
                },
                rangedHeal: {
                }
              },
              body: [
                {
                  "type": "move",
                  "hits": 100
                },
                {
                  "type": "work",
                  "hits": 100
                },
                {
                  "type": "work",
                  "hits": 100
                },
                {
                  "type": "attack",
                  "hits": 100
                },
                {
                  "type": "ranged_attack",
                  "hits": 100
                },
                {
                  "type": "claim",
                  "hits": 100
                },
                {
                  "type": "heal",
                  "hits": 100
                },
              ]
            },
            50: {
              actionLog: {
                harvest: null,
                dismantle: null,
                repair: null,
                build: null,
                upgradeController: null,
                attack: null,
                rangedAttack: null,
                rangedMassAttack: null,
                heal: null,
                rangedHeal: null
              },
            }
          }
        },
          {
            type: TestHelper.dataTypes.tower, data: {
              0: {
                heal: {
                },
              }
            }
          })
      }

      const data = await testHelper1.process(settings)
      const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
      expect(base.intents.income.harvest).toBe(20 * 2 / 2)
      expect(base.intents.income.dismantle).toBe(2.5 * 2 / 2)

      expect(base.intents.outcome.repair).toBe(10 * 2 / 2)
      expect(base.intents.outcome.build).toBe(50 * 2 / 2)
      expect(base.intents.outcome.upgradeController).toBe(10 * 2 / 2)

      expect(base.intents.offensive.attack).toBe(300 / 2)
      expect(base.intents.offensive.rangedAttack).toBe(100 / 2)
      expect(base.intents.offensive.rangedMassAttack).toBe(40 / 2)
      expect(base.intents.offensive.heal).toBe(120 / 2)
      expect(base.intents.offensive.rangedHeal).toBe(40 / 2)
    })
    it('should handle spawns correctly', async () => {
      const settings = []

      for (let s = 0; s < 1; s += 1) {
        settings.push({
          type: TestHelper.dataTypes.spawn, data: {
            0: {
              spawning: {
                spawnTime: 50,
              },
            },
            75: {
              spawning: {
                spawnTime: 105,
              },
            }
          }
        })
      }

      const data = await testHelper1.process(settings)
      const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
      expect(base.spawning.spawnUptimePercentage).toBe(0.75)
    })
    describe('should count intent totals correctly', () => {
      it('should handle static non changing values', async () => {
        const settings = []
        for (let i = 1; i <= 10; i += 1) {
          settings.push({
            type: TestHelper.dataTypes.creep, data: {
              0: {
                actionLog: {
                  repair: {
                    x: 35,
                    y: 38
                  },
                  harvest: {
                    x: 35,
                    y: 38
                  },
                },
                body: [
                  {
                    "type": "work",
                    "hits": 100
                  },
                ]
              },
            }
          })
        }

        const data = await testHelper1.process(settings)
        const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
        expect(base.totals.intents).toBe(10 * 2)
      })
      it('should handle fluctuating values', async () => {
        const settings = []
        for (let i = 1; i <= 10; i += 1) {
          settings.push({
            type: TestHelper.dataTypes.creep, data: {
              0: {
                actionLog: {
                  repair: {
                    x: 35,
                    y: 38
                  },
                  harvest: {
                    x: 35,
                    y: 38
                  },
                },
                body: [
                  {
                    "type": "work",
                    "hits": 100
                  },
                ]
              },
              50: {
                actionLog: {
                  repair: null,
                  harvest: null,
                },
              }
            }
          })
        }

        const data = await testHelper1.process(settings)
        const base = data.stats.users[data.opts.username].stats.combined.shards[data.opts.shard]
        expect(base.totals.intents).toBe(10)
      })
    })
  })
})