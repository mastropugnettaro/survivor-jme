#ifndef QUADS_PER_PASS
  #define QUADS_PER_PASS 1
#endif

#define DEF // just to fix syntax highlighting a bit

#if defined(MATERIAL_COLORS) && defined(DIFFUSE)
  #define NEED_DIFFUSE
#endif

#if defined(MATERIAL_COLORS) && defined(SPECULAR)
  #define NEED_SPECULAR
#endif

#if defined(PARALLAX_LOD_THRESHOLD)
  #if PARALLAX_LOD_THRESHOLD >= 0
    #define USE_LOD
  #endif
#endif

#ifdef MATERIAL_COLORS
  uniform vec4 m_Ambient;
  uniform vec4 m_Diffuse;
  uniform vec4 m_Specular;
#endif
uniform float m_Shininess;

#if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP)
  #define NEED_TEXCOORD
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

  #ifndef HEIGHTMAP_SIZE
    #define HEIGHTMAP_SIZE 256
  #endif

  uniform float m_ParallaxHeight;

  float getHeightSample(const in vec2 texCoord)
  {
    #if defined(PARALLAXMAP)
      return texture2D(m_ParallaxMap, texCoord).r;
    #elif defined(NORMALMAP_PARALLAX)
      return texture2D(m_NormalMap, texCoord).a;
    #endif
  }

  #ifdef PARALLAX_DEPTH_CORRECTION
    uniform vec2 g_FrustumNearFar;

    float getFragDepth(const float z)
    {
      float near = g_FrustumNearFar.x;
      float far = g_FrustumNearFar.y;
      return ((-far / (far - near) * z - far * near / (near - far)) / -z);
    }
  #endif

  #ifdef STEEP_PARALLAX

    varying vec2 v_tsParallaxOffset;

    // Minimum and maximum samples / iterations when calculation POM
    const float c_ParallaxScale = PARALLAX_HEIGHT * 0.3; // steep compatibility
    const float c_PomMinSamples = 6.0;
    const float c_PomMaxSamples = 1000.0 * c_ParallaxScale;

    #ifdef USE_LOD

      const int c_nLODThreshold = PARALLAX_LOD_THRESHOLD;
      //const bool c_bVisualizeLOD = false;

      // Adaptive in-shader level-of-detail system implementation. Compute the 
      // current mip level explicitly in the pixel shader and use this information 
      // to transition between different levels of detail from the full effect to 
      // simple bump mapping. See the above paper for more discussion of the approach
      // and its benefits. (see: Tatarchuk-POM-SI3D06.pdf)

      // Compute the current gradients:
      vec2 tmp_fTexCoordsPerSize = v_TexCoord * float(HEIGHTMAP_SIZE);

      // Compute all 4 derivatives in x and y in a single instruction to optimize:
      vec4 tmp_sdx = dFdx(vec4(tmp_fTexCoordsPerSize, v_TexCoord));
      vec4 tmp_sdy = dFdy(vec4(tmp_fTexCoordsPerSize, v_TexCoord));

      vec2 tmp_dxSize = vec2(tmp_sdx.xy);
      vec2 tmp_dySize = vec2(tmp_sdy.xy);
      vec2 dx         = vec2(tmp_sdx.zw);
      vec2 dy         = vec2(tmp_sdy.zw);

      // Find min of change in u and v across quad: compute du and dv magnitude across quad
      vec2 tmp_dTexCoords = tmp_dxSize * tmp_dxSize + tmp_dySize * tmp_dySize;
      // Standard mipmapping uses max here
      float tmp_fMinTexCoordDelta = max(tmp_dTexCoords.x, tmp_dTexCoords.y); 
      // Compute the current mip level  (* 0.5 is effectively computing a square root before )
      float fMipLevel = max(0.5 * log2(tmp_fMinTexCoordDelta), 0.0);
    #endif

    float calculateNumSteps(const in vec3 V)
    {
      // steep parallax method
      return mix(c_PomMinSamples, c_PomMaxSamples, V.z + 1.0);
    }

    void calculatePomTexCoord(const in float fNumSteps, inout vec2 pomTexCoord)
    {
      //===============================================//
      // Parallax occlusion mapping offset computation //
      //===============================================//

      // Intersect the view ray with the height field profile along the direction of
      // the parallax offset ray (computed in the vertex shader. Note that the code is
      // designed specifically to take advantage of the dynamic flow control constructs
      // in HLSL and is very sensitive to specific syntax. When converting to other examples,
      // if still want to use dynamic flow control in the resulting assembly shader,
      // care must be applied.
      // 
      // In the below steps we approximate the height field profile as piecewise linear
      // curve. We find the pair of endpoints between which the intersection between the 
      // height field profile and the view ray is found and then compute line segment
      // intersection for the view ray and the line segment formed by the two endpoints.
      // This intersection is the displacement offset from the original texture coordinate.
      // See the above paper for more details about the process and derivation.

      float fCurrHeight = 0.0;
      float fPrevHeight = 1.0;
      float fStepSize = 1.0 / fNumSteps;
      float fStepIndex = 0.0;
      vec2 vTexOffsetPerStep = fStepSize * v_tsParallaxOffset;
      vec2 vTexCurrentOffset = pomTexCoord;
      float fCurrentBound = 1.0;

      // Cutting the useless crap from POM reference shader (DirectX SDK)
      // leaves the tight loop of steep parallax mapping.
      while (fCurrHeight <= fCurrentBound && fStepIndex < fNumSteps)
      {
        vTexCurrentOffset -= vTexOffsetPerStep;
        fPrevHeight = fCurrHeight;
        fCurrHeight = getHeightSample(vTexCurrentOffset);
        fCurrentBound -= fStepSize;
        fStepIndex += 1.0;
      }

      vec2 pt1 = vec2(fCurrentBound, fCurrHeight);
      vec2 pt2 = vec2(fCurrentBound + fStepSize, fPrevHeight);

      float fDelta2 = pt2.x - pt2.y;
      float fDelta1 = pt1.x - pt1.y;

      float fDenominator = fDelta2 - fDelta1;
      float fParallaxAmount = (pt1.x * fDelta2 - pt2.x * fDelta1) / fDenominator;
      vec2 vParallaxOffset = v_tsParallaxOffset * (1.0 - fParallaxAmount);
      
      #ifdef PARALLAX_DEPTH_CORRECTION
        gl_FragDepth = getFragDepth((gl_FragCoord.z + (1.0 - fParallaxAmount) * 
          (1.0 + c_ParallaxScale) / v_View.z) / gl_FragCoord.w);
      #endif

      // The computed texture offset for the displaced point on the pseudo-extruded surface:
      vec2 texSampleBase = pomTexCoord - vParallaxOffset;
      pomTexCoord = texSampleBase;

      //if (pomTexCoord.x < 0.0) discard;
      //if (pomTexCoord.x > 1.0) discard;
      //if (pomTexCoord.y < 0.0) discard;
      //if (pomTexCoord.y > 1.0) discard;	

      #ifdef USE_LOD

        // Multiplier for visualizing the level of detail (see notes for 'nLODThreshold' variable
        // for how that is done visually)
        // vec4 cLODColoring = vec4(1.0, 1.0, 3.0, 1.0);

        // cLODColoring = vec4(1.0, 1.0, 1.0, 1.0);

        // Lerp to bump mapping only if we are in between, transition section:
        if (fMipLevel > float(c_nLODThreshold - 1))
        {
          // Lerp based on the fractional part:
          // fMipLevelFrac = modf(fMipLevel, fMipLevelInt); // needs GLSL130
          float fMipLevelFrac = mod(fMipLevel, 1.0); // mip level fractional amount for blending in between levels
          float fMipLevelInt = floor(fMipLevel); // mip level integer portion

          // if (g_bVisualizeLOD)
          // {
          //   // For visualizing: lerping from regular POM-resulted color through blue color for transition layer:
          //   cLODColoring = vec4(1.0, 1.0, max(1.0, 2.0 * fMipLevelFrac), 1.0);
          // }

          // Lerp the texture coordinate from parallax occlusion mapped coordinate to bump mapping
          // smoothly based on the current mip level:
          pomTexCoord = mix(texSampleBase, v_TexCoord, fMipLevelFrac);
        }
      #endif
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

  #ifdef NEED_TEXCOORD
    vec2 texCoord = v_TexCoord;
  #endif

  #ifdef NORMALMAP
    #if defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)
      #ifdef STEEP_PARALLAX
        #ifdef USE_LOD
          if (fMipLevel <= float(c_nLODThreshold))
        #endif
        {
          float fNumSteps = calculateNumSteps(V);
          calculatePomTexCoord(fNumSteps, texCoord);
        }
      #else
        calculateParallaxTexCoord(V, texCoord);
      #endif
    #endif
    N = normalize(vec3(texture2D(m_NormalMap, texCoord)) * vec3(2.0, -2.0, 2.0) - vec3(1.0, -1.0, 1.0));
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
}
