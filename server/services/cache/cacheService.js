// server/services/cache/cacheService.js
const Redis = require('ioredis');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 2 * 60 * 60; // 2 heures par défaut
  }

  async initialize() {
    try {
      // Configuration Redis avec fallback
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        showFriendlyErrorStack: true
      });

      this.client.on('error', (err) => {
        console.warn('⚠️  Redis error (cache will be disabled):', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis cache connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('🚀 Redis cache ready');
        this.isConnected = true;
      });

      await this.client.connect();
      
    } catch (error) {
      console.warn('⚠️  Redis cache initialization failed, running without cache:', error.message);
      this.isConnected = false;
    }
  }

  /**
   * Génère une clé de cache pour les requêtes de vol
   */
  generateFlightCacheKey(params) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    return `flights:${Buffer.from(JSON.stringify(sortedParams)).toString('base64')}`;
  }

  /**
   * Récupère des résultats de vol depuis le cache
   */
  async getFlightResults(params) {
    if (!this.isConnected || !this.client) return null;

    try {
      const key = this.generateFlightCacheKey(params);
      const cached = await this.client.get(key);
      
      if (cached) {
        const result = JSON.parse(cached);
        const cacheAge = Math.round((Date.now() - result.cached_at) / 1000 / 60); // en minutes
        
        console.log(`🎯 Cache HIT pour vol ${params.dep_iata || params.depIata}-${params.arr_iata || params.arrIata} (âge: ${cacheAge}min)`);
        
        return {
          ...result.data,
          fromCache: true,
          cacheAge: cacheAge,
          cachedAt: new Date(result.cached_at)
        };
      }
      
      console.log(`❌ Cache MISS pour vol ${params.dep_iata || params.depIata}-${params.arr_iata || params.arrIata}`);
      return null;
      
    } catch (error) {
      console.warn('⚠️  Cache read error:', error.message);
      return null;
    }
  }

  /**
   * Stocke des résultats de vol dans le cache
   */
  async setFlightResults(params, data, customTTL = null) {
    if (!this.isConnected || !this.client) return false;

    try {
      const key = this.generateFlightCacheKey(params);
      const ttl = customTTL || this.defaultTTL;
      
      const cacheData = {
        data: data,
        cached_at: Date.now(),
        params: params,
        ttl: ttl
      };
      
      await this.client.setex(key, ttl, JSON.stringify(cacheData));
      
      const ttlHours = Math.round(ttl / 3600);
      console.log(`💾 Résultats vol ${params.dep_iata || params.depIata}-${params.arr_iata || params.arrIata} mis en cache (${ttlHours}h)`);
      
      return true;
      
    } catch (error) {
      console.warn('⚠️  Cache write error:', error.message);
      return false;
    }
  }

  /**
   * Cache adaptatif selon la période
   */
  getAdaptiveTTL(hour, dayOfWeek) {
    const isTuesday = dayOfWeek === 2;
    const isOptimalPeriod = (hour >= 2 && hour <= 10) && (isTuesday || dayOfWeek === 3 || dayOfWeek === 4);
    
    if (isOptimalPeriod) {
      // Période optimale : cache plus court pour capturer les deals rapidement
      return 90 * 60; // 1.5 heures
    } else {
      // Période normale : cache plus long pour économiser le quota
      return 4 * 60 * 60; // 4 heures
    }
  }

  /**
   * Invalide le cache pour une route spécifique
   */
  async invalidateFlightRoute(depIata, arrIata) {
    if (!this.isConnected || !this.client) return false;

    try {
      // Pattern pour trouver toutes les clés de cette route
      const pattern = `flights:*${depIata}*${arrIata}*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(`🗑️  Cache invalidé pour ${depIata}-${arrIata} (${keys.length} entrées)`);
      }
      
      return true;
      
    } catch (error) {
      console.warn('⚠️  Cache invalidation error:', error.message);
      return false;
    }
  }

  /**
   * Nettoie le cache expiré
   */
  async cleanExpiredCache() {
    if (!this.isConnected || !this.client) return;

    try {
      // Redis s'occupe automatiquement de l'expiration, mais on peut logger
      const info = await this.client.info('keyspace');
      console.log('🧹 Cache Redis - Statistiques:', info);
      
    } catch (error) {
      console.warn('⚠️  Cache cleanup error:', error.message);
    }
  }

  /**
   * Statistiques du cache
   */
  async getCacheStats() {
    if (!this.isConnected || !this.client) {
      return { 
        enabled: false, 
        message: 'Cache Redis non disponible' 
      };
    }

    try {
      const info = await this.client.info();
      const keyspace = await this.client.info('keyspace');
      
      return {
        enabled: true,
        connected: this.isConnected,
        keyspace: keyspace,
        memory: info.includes('used_memory_human') ? 
          info.split('used_memory_human:')[1].split('\r\n')[0] : 'N/A'
      };
      
    } catch (error) {
      return { 
        enabled: false, 
        error: error.message 
      };
    }
  }

  /**
   * Force la fermeture de la connexion
   */
  async close() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      console.log('🔌 Redis cache connection closed');
    }
  }
}

// Instance singleton
const cacheService = new CacheService();

module.exports = cacheService; 