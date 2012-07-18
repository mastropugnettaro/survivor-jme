#extension GL_ATI_shader_texture_lod : enable
#extension GL_EXT_gpu_shader4 : enable

#ifndef QUADS_PER_PASS
  #define QUADS_PER_PASS 1
#endif

#ifndef PARALLAXMAP_SIZE
  #define PARALLAXMAP_SIZE 256
#endif

#ifndef PARALLAXMAP_LOD
  #define PARALLAXMAP_LOD 8
#endif

#define DEF // just to fix syntax highlighting a bit

#if defined(MATERIAL_COLORS) && defined(DIFFUSE)
  #define NEED_DIFFUSE
#endif

#if defined(MATERIAL_COLORS) && defined(SPECULAR)
  #define NEED_SPECULAR
#endif

#ifdef MATERIAL_COLORS
  uniform vec4 m_Ambient;
  uniform vec4 m_Diffuse;
  uniform vec4 m_Specular;
#endif
uniform float m_Shininess;

#if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP)
  varying vec2 v_TexCoord;
#endif

#ifdef DIFFUSEMAP
  uniform sampler2D m_DiffuseMap;
#endif

#ifdef HAS_SPOTLIGHTS
  uniform vec4 g_SpotQuadX[QUADS_PER_PASS];
  uniform vec4 g_SpotQuadY[QUADS_PER_PASS];
  uniform vec4 g_SpotQuadZ[QUADS_PER_PASS];
  uniform vec4 g_SpotQuadW[QUADS_PER_PASS];
#endif
uniform vec4 g_LightColor[QUADS_PER_PASS*4];
uniform vec4 g_AmbientLightColor;

varying vec3 v_View;

#define ALQ_FP_LC const in vec4 LC0, const in vec4 LC1, const in vec4 LC2, const in vec4 LC3
#define ALQ_AP_LC g_LightColor[4*QI+0], g_LightColor[4*QI+1], g_LightColor[4*QI+2], g_LightColor[4*QI+3]

#define ALQ_FP_WVN , const in vec4 LW, const in vec3 V, const in vec3 N
#define ALQ_AP_WVN , g_LightQuadW[QI], V, N

#ifdef NORMALMAP
  uniform sampler2D m_NormalMap;

  varying vec4 v_tsLightQuadX[QUADS_PER_PASS];
  varying vec4 v_tsLightQuadY[QUADS_PER_PASS];
  varying vec4 v_tsLightQuadZ[QUADS_PER_PASS];

  #define ALQ_FP_TS , const in vec4 tsLX, const in vec4 tsLY, const in vec4 tsLZ
  #define ALQ_AP_TS , v_tsLightQuadX[QI], v_tsLightQuadY[QI], v_tsLightQuadZ[QI]
#else
  varying vec3 v_Normal;

  #define ALQ_FP_TS
  #define ALQ_AP_TS
#endif

uniform vec4 g_LightQuadW[QUADS_PER_PASS];

#if !defined(NORMALMAP) || defined(HAS_SPOTLIGHTS)
  varying vec4 v_wsLightQuadX[QUADS_PER_PASS];
  varying vec4 v_wsLightQuadY[QUADS_PER_PASS];
  varying vec4 v_wsLightQuadZ[QUADS_PER_PASS];

  #define ALQ_FP_WS , const in vec4 wsLX, const in vec4 wsLY, const in vec4 wsLZ
  #define ALQ_AP_WS , v_wsLightQuadX[QI], v_wsLightQuadY[QI], v_wsLightQuadZ[QI]
#else
  #define ALQ_FP_WS
  #define ALQ_AP_WS
#endif

#ifdef HAS_SPOTLIGHTS
  #define ALQ_FP_LD , const in vec4 LDX, const in vec4 LDY, const in vec4 LDZ, const in vec4 LDW
  #define ALQ_AP_LD , g_SpotQuadX[QI], g_SpotQuadY[QI], g_SpotQuadZ[QI], g_SpotQuadW[QI]
#else
  #define ALQ_FP_LD
  #define ALQ_AP_LD
#endif

#define ALQ_FP_OUT , inout vec4 diffuseSum, inout vec4 specularSum
#define ALQ_AP_OUT , diffuseSum, specularSum

#define ALQ_FP ALQ_FP_LC ALQ_FP_WVN ALQ_FP_WS ALQ_FP_TS ALQ_FP_LD ALQ_FP_OUT
#define ALQ_AP ALQ_AP_LC ALQ_AP_WVN ALQ_AP_WS ALQ_AP_TS ALQ_AP_LD ALQ_AP_OUT

const vec2 specular_ab = vec2(6.645, -5.645);
//vec2 specular_ab = vec2(m_Shininess, m_Shininess * -0.985);

#if defined(PARALLAXMAP)
  uniform sampler2D m_ParallaxMap;
#endif

#if defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)
  uniform float m_ParallaxHeight;

  float getHeightSample(const in vec2 texCoord)
  {
    #if defined(PARALLAXMAP)
      return texture2D(m_ParallaxMap, texCoord).r;
    #elif defined(NORMALMAP_PARALLAX)
      return texture2D(m_NormalMap, texCoord).a;
    #endif
  }

  #ifdef STEEP_PARALLAX

    float getHeightSample(const in vec2 texCoord, const in float lod)
    {
      #if defined(PARALLAXMAP)
        return texture2DLod(m_ParallaxMap, texCoord, lod).r;
      #elif defined(NORMALMAP_PARALLAX)
        return texture2DLod(m_NormalMap, texCoord, lod).a;
      #endif
    }

    #define QDM_OFFSET 0.0001
    const float minLod = 0.0; // todo: calculate minimal LoD (ddx, ddy)
    float scale = m_ParallaxHeight * 0.3; // todo: calculate m_ParallaxHeight * 0.3 in vs like v_tsParallaxOffset

    bool debug = false;
    vec3 diff = vec3(0.0);
    int path = 0;

    vec3 getInterpolatedPosition(
      const in vec3 E, const in vec3 P, const in float size, const in float lod)
    {
      float halfSampleSize = 0.5 / size;
      vec3 halfSampleOffset = E * (halfSampleSize * (abs(E.x) + abs(E.y) + abs(E.y)) / 3.0);
      vec3 Pa = P - halfSampleOffset;
      vec3 Pb = P + halfSampleOffset;
      float da = (-1.0 + getHeightSample(Pa.xy, lod)) * scale;
      float db = (-1.0 + getHeightSample(Pb.xy, lod)) * scale;
      float a = abs(Pa.z - da);
      float b = abs(Pb.z - db);
      float mf = a / (a + b);
      return mix(Pa, Pb, mf);
    }

    void calculateQdmTexCoord(const in vec3 E, inout vec2 parallaxTexCoord)
    {
      if (E.z > -0.01) return;

      float lod = float(PARALLAXMAP_LOD);
      float size = 1.0;
      //float lod = 0.0;
      //float size = 256.0;
      float depth = 0.0;
      vec3 P = vec3(parallaxTexCoord, 0.0);
      vec3 En = normalize(E);
      En.xy *= scale;
      En /= abs(En.z);
      vec2 T = step(0.0, En.xy);
      bool tracing = true;
      int counter = 0;
    
      while (tracing)
      {
        while (lod > minLod) // todo: dynamic LoD
        {
          if (counter++ > 100)
          {
            tracing = false;
            break;
          }

          vec2 tc = floor(P.xy * size) / size;
          depth = -1.0 + getHeightSample(tc, lod);

          if (P.z > depth)
          {
            vec2 A = T / size;
            vec3 B = vec3(tc + A, depth);
            vec3 F = (B - P) / En;

            if ((F.z < F.x) && (F.z < F.y))
            {
              P = P + En * F.z;
              P.z = depth;
              lod -= 1.0;
              size *= 2.0;
              path = 1; // green
            }
            else
            {
              P = P + En * (min(F.x, F.y) + QDM_OFFSET);
/*
              if (F.x < F.y)
              {
                P = P + En * F.x;
                P.x = B.x;
              }
              else
              {
                P = P + En * F.y;
                P.y = B.y;
              }
*/
              path = 2; // blue
            }
          }
          else
          {
            if (path == 1) path = 3; // red
            lod -= 1.0;
            size *= 2.0;
          }
        }

        //if (lod == 0.0)
        if (false)
        {
          size = 256.0;
          vec2 A = T / size;
          vec2 B = vec2(floor(P.xy * size) / size + A);
          vec2 F = (B - P.xy) / En.xy;
          float Fmin = min(F.x, F.y);
          int numSteps = 8;
          float stepSize = (Fmin + QDM_OFFSET) / float(numSteps);

          // linear search...
          for (int i = 0; i < numSteps; i++)
          {
            depth = -1.0 + getHeightSample(P.xy, 0.0);
            if (P.z < depth)
            {
              if (i == 0)
              {
                float depth2 = -1.0 + getHeightSample(P.xy, 1.0);
                if (depth2 < depth) debug = true;
              }
              else
              {
              }

              tracing = false;
              i = numSteps;
            }
            else
            {
              P = P + En * stepSize;
            }
          }

          //if (false)
          if (!tracing)
          {
            float sgn = -1.0;

            // binary search...
            for (int i = 0; i < numSteps; i++)
            {
              stepSize *= 0.5;            
              P = P + En * (stepSize * sgn);

              if (P.z < depth)
              {
                sgn = -1.0;
              }
              else
              {
                sgn = 1.0;
              }

              depth = -1.0 + getHeightSample(P.xy, 0.0);
            }
          }
          else
          {
            //lod = float(PARALLAXMAP_LOD);
            //size = 1.0;
            //lod += 1.0;
            //size /= 2.0;
            //debug = true;
          }
        }
        else
        {
          tracing = false;
        }
      }

      parallaxTexCoord = P.xy;
      diff = P;
    }

  #else

    void calculateParallaxTexCoord(const in vec3 V, inout vec2 parallaxTexCoord)
    {
      float h = getHeightSample(parallaxTexCoord);
      float heightBias = m_ParallaxHeight * -0.6;
      h = (h * m_ParallaxHeight + heightBias) * V.z;
      parallaxTexCoord = parallaxTexCoord + (h * V.xy);
    }

  #endif
#endif

//#define LOW_QUALITY_SPECULAR
#ifdef LOW_QUALITY_SPECULAR
  vec4 computeSpecularPower(const in vec4 v)
  {
    // originally: pow(v, N)
    // x^N is roughly equal to (max(Ax+B, 0))^2
    // A,B depend on N
    vec4 t = clamp(specular_ab.x * v + specular_ab.y, 0.0, 1.0);
    return t * t;
  }
#endif

void addLightQuad(DEF ALQ_FP)
{
  vec4 diffuseQuad, specularQuad;

  #if defined(NEED_DIFFUSE) || defined(DIFFUSEMAP) || defined(NEED_SPECULAR) || defined(SPECULARMAP)

    #if !defined(NORMALMAP) || defined(HAS_SPOTLIGHTS)
      vec4 wsLengths = sqrt(wsLX * wsLX + wsLY * wsLY + wsLZ * wsLZ);
    #endif

    // compute lengths and scale in parallel
    #ifdef NORMALMAP
      vec4 lightLengths = sqrt(tsLX * tsLX + tsLY * tsLY + tsLZ * tsLZ);
    #else
      vec4 lightLengths = wsLengths;
    #endif

    vec4 intensity = vec4(1.0) - LW * lightLengths;

    #ifdef HAS_SPOTLIGHTS
      vec4 curAngleCos = (wsLX * LDX + wsLY * LDY + wsLZ * LDZ) / wsLengths;
      vec4 innerAngleCos = floor(LDW) * vec4(0.001);
      vec4 outerAngleCos = fract(LDW);
      vec4 innerMinusOuter = innerAngleCos - outerAngleCos;
      vec4 spotFallOff = clamp((curAngleCos - outerAngleCos) / innerMinusOuter, 0.0, 1.0);
      intensity *= spotFallOff;
    #endif

    intensity = clamp(intensity, vec4(0.0), vec4(1.0));
    vec4 scale = intensity / lightLengths;
  #endif

  #if defined(NEED_DIFFUSE) || defined(DIFFUSEMAP)
    // compute NdotL in parallel
    #ifdef NORMALMAP
      vec4 NdotL = tsLX * N.x + tsLY * N.y + tsLZ * N.z;
    #else
      vec4 NdotL = wsLX * N.x + wsLY * N.y + wsLZ * N.z;
   #endif

    // normalize NdotL and scale by intensity
    diffuseQuad = max(vec4(0.0), NdotL * scale) * intensity;
  #endif

  #if defined(NEED_SPECULAR) || defined(SPECULARMAP)
    // dot(reflect(-L, N), V) == dot(reflect(-V, N), L)
    // compute RdotL in parallel
    vec3 R = reflect(-V, N);
    #ifdef NORMALMAP
      vec4 RdotL = tsLX * R.x + tsLY * R.y + tsLZ * R.z;
    #else
      vec4 RdotL = wsLX * R.x + wsLY * R.y + wsLZ * R.z;
   #endif

    // normalize RdotL and scale by intensity
    RdotL = max(vec4(0.0), RdotL * scale);

    // specular
    #ifdef LOW_QUALITY_SPECULAR
      specularQuad = computeSpecularPower(RdotL); // cheap, low quality
    #else
      specularQuad[0] = pow(max(RdotL[0], 0.0), m_Shininess);
      specularQuad[1] = pow(max(RdotL[1], 0.0), m_Shininess);
      specularQuad[2] = pow(max(RdotL[2], 0.0), m_Shininess);
      specularQuad[3] = pow(max(RdotL[3], 0.0), m_Shininess);
    #endif
  #endif

  diffuseSum += diffuseQuad[0] * LC0;
  diffuseSum += diffuseQuad[1] * LC1;
  diffuseSum += diffuseQuad[2] * LC2;
  diffuseSum += diffuseQuad[3] * LC3;

  specularSum += specularQuad[0] * LC0;
  specularSum += specularQuad[1] * LC1;
  specularSum += specularQuad[2] * LC2;
  specularSum += specularQuad[3] * LC3;
}

void main (void)
{
  vec3 V; // view vector
  vec3 N; // normal vector

  V = normalize(v_View);
  vec2 texCoord = v_TexCoord;

  #ifdef NORMALMAP
    #if defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)
      #ifdef STEEP_PARALLAX
        calculateQdmTexCoord(-V, texCoord);
      #else
        calculateParallaxTexCoord(V, texCoord);
      #endif
    #endif
    N = normalize(vec3(texture2D(m_NormalMap, texCoord)) * 2.0 - 1.0);
  #else
    N = normalize(v_Normal);
  #endif

  #if defined(MATERIAL_COLORS)
    gl_FragColor = m_Ambient * g_AmbientLightColor;
  #else
    gl_FragColor = vec4(0.2, 0.2, 0.2, 1.0) * g_AmbientLightColor;
  #endif

  vec4 diffuseSum = vec4(0.0);
  vec4 specularSum = vec4(0.0);

  #undef QI
  #define QI 0
  #if QUADS_PER_PASS > QI
    addLightQuad(ALQ_AP);
  #endif

  #undef QI
  #define QI 1
  #if QUADS_PER_PASS > QI
    addLightQuad(ALQ_AP);
  #endif

  #undef QI
  #define QI 2
  #if QUADS_PER_PASS > QI
    addLightQuad(ALQ_AP);
  #endif

  #undef QI
  #define QI 3
  #if QUADS_PER_PASS > QI
    addLightQuad(ALQ_AP);
  #endif

  #undef QI
  #define QI 4
  #if QUADS_PER_PASS > QI
    addLightQuad(ALQ_AP);
  #endif

  #undef QI
  #define QI 5
  #if QUADS_PER_PASS > QI
    addLightQuad(ALQ_AP);
  #endif

  #undef QI
  #define QI 6
  #if QUADS_PER_PASS > QI
    addLightQuad(ALQ_AP);
  #endif

  #undef QI
  #define QI 7
  #if QUADS_PER_PASS > QI
    addLightQuad(ALQ_AP);
  #endif

  #if defined(NEED_DIFFUSE) || defined(DIFFUSEMAP)
    #ifdef NEED_DIFFUSE
      diffuseSum *= m_Diffuse;
    #endif
    #ifdef DIFFUSEMAP
      diffuseSum *= texture2D(m_DiffuseMap, texCoord);
    #endif
    gl_FragColor += diffuseSum;
  #endif

  #if defined(NEED_SPECULAR) || defined(SPECULARMAP)
    #ifdef NEED_SPECULAR
      specularSum *= m_Specular;
    #endif
    #ifdef SPECULARMAP
      specularSum *= texture2D(m_SpecularMap, texCoord);
    #endif
    gl_FragColor += specularSum;
  #endif

  //if (path == 1) gl_FragColor.g = 1.0;
  //if (path == 2) gl_FragColor.b = 1.0;
  //if (path == 3) gl_FragColor.r = 1.0;
  //gl_FragColor.rgb = vec3(-diff.z * 10.0);

  //if (debug) gl_FragColor.r = 1.0;
  //gl_FragColor.rgb = vec3(1.0 + diff.z * 10.0);
}