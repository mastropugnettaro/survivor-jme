//#extension GL_EXT_gpu_shader4 : enable
#import "MatDefs/Light/Parallax.glsllib"

#ifndef NUM_LIGHTS
  #define NUM_LIGHTS 1
#endif

#if defined(MATERIAL_COLORS) && defined(DIFFUSE)
  #define NEED_DIFFUSE
#endif
#if defined(MATERIAL_COLORS) && defined(SPECULAR)
  #define NEED_SPECULAR
#endif

#if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP) || defined(PARALLAXMAP)
  varying vec2 v_TexCoord;
#endif

#ifdef DIFFUSEMAP
  uniform sampler2D m_DiffuseMap;
#endif

#ifdef VERTEX_LIGHTING

  void textureVertexFragment()
  {
    // calculate Diffuse Term:
    #if defined(MATERIAL_COLORS) || defined(DIFFUSEMAP)
      vec4 Idiff = gl_Color;
      #ifdef DIFFUSEMAP
        Idiff *= texture2D(m_DiffuseMap, v_TexCoord);
        Idiff = clamp(Idiff, 0.0, 1.0);
      #endif
    #else
      vec4 Idiff = vec4(0.0);
    #endif

    // calculate Specular Term:
    #ifdef SPECULARMAP
      vec4 Ispec = gl_Color;
      Idiff *= texture2D(m_SpecularMap, v_TexCoord);
      Ispec = clamp(Ispec, 0.0, 1.0);
    #else
      vec4 Ispec = vec4(0.0);
    #endif

    gl_FragColor = Idiff + Ispec;
  }

#else // per fragment lighting

  uniform mat4 g_WorldViewProjectionMatrix;
  uniform mat4 g_WorldViewMatrix;
  uniform mat4 g_ViewMatrix;
  uniform mat3 g_NormalMatrix;

  uniform vec4 g_LightPosition[NUM_LIGHTS];
  uniform vec4 g_LightColor[NUM_LIGHTS];
  uniform vec4 g_AmbientLightColor;

  #ifdef MATERIAL_COLORS
    uniform vec4 m_Ambient;
    uniform vec4 m_Diffuse;
    uniform vec4 m_Specular;
  #endif
  uniform float m_Shininess;

  varying vec3 v_wsPosition;
  varying vec3 v_wsView;
  varying vec3 v_wsNormal;

  #if defined(NORMALMAP)
    uniform sampler2D m_NormalMap;
    varying vec3 v_wsTangent;
    varying vec3 v_wsBitangent;

    #if defined(PARALLAXMAP)
      uniform sampler2D m_ParallaxMap;
    #endif

    #if defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)
      uniform float m_ParallaxHeight;
      uniform float m_PomShadowSoftening;
      uniform int m_PomMinSamples;
      uniform int	m_PomMaxSamples;
      uniform int m_TextureSize;

      #define POM_USE_TEX_GRAD
      //#define POM_USE_TEX_LOD
      //#define POM_ENABLE_SHADOWS

      const int g_nLODThreshold = 4;
      const bool g_bVisualizeLOD = false;
/*
      // Adaptive in-shader level-of-detail system implementation. Compute the 
      // current mip level explicitly in the pixel shader and use this information 
      // to transition between different levels of detail from the full effect to 
      // simple bump mapping. See the above paper for more discussion of the approach
      // and its benefits. (see: Tatarchuk-POM-SI3D06.pdf)

      // Compute the current gradients:
      vec2 tmp_fTexCoordsPerSize = v_TexCoord * m_TextureSize;

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

      float getHeightSample(const in vec2 texCoord)
      {
        #if defined(PARALLAXMAP)
          return texture2D(m_ParallaxMap, texCoord).r;
        #elif defined(NORMALMAP_PARALLAX)
          return texture2D(m_NormalMap, texCoord).a;
        #endif
      }

      float getHeightSample(const in vec2 texCoord, const in float lod)
      {
        #if defined(PARALLAXMAP)
          return texture2DLod(m_ParallaxMap, texCoord, lod).r;
        #elif defined(NORMALMAP_PARALLAX)
          return texture2DLod(m_NormalMap, texCoord, lod).a;
        #endif
      }

      #ifdef GL_EXT_gpu_shader4
        float getHeightSample(const in vec2 texCoord, const in vec2 dx, in vec2 dy)
        {
          #if defined(PARALLAXMAP)
            return texture2DGrad(m_ParallaxMap, texCoord, dx, dy).r;
          #elif defined(NORMALMAP_PARALLAX)
            return texture2DGrad(m_NormalMap, texCoord, dy, dy).a;
          #endif
        }
      #endif
      
      float getPomHeightSample(const in vec2 texCoord)
      {
        #if (defined(POM_USE_TEX_GRAD) && defined(GL_EXT_gpu_shader4))
          return getHeightSample(texCoord, dx, dy);
        #elif defined(POM_USE_TEX_LOD)
          return getHeightSample(texCoord, fMipLevel);
        #else
          return getHeightSample(texCoord);
        #endif
      }
*/
      void calculatePomTexCoord(const in vec3 tsView, const in vec3 wsView, const in vec3 wsNormal, inout vec2 pomTexCoord)
      {
        // Multiplier for visualizing the level of detail (see notes for 'nLODThreshold' variable
        // for how that is done visually)
        // vec4 cLODColoring = vec4(1.0, 1.0, 3.0, 1.0);

        float  fMipLevelInt;    // mip level integer portion
        float  fMipLevelFrac;   // mip level fractional amount for blending in between levels

        // Compute the ray direction for intersecting the height field profile with 
        // current view ray. See the above paper for derivation of this computation.

        // Compute initial parallax displacement direction:
        vec2 vParallaxDirection = tsView.xy;

        // The length of this vector determines the furthest amount of displacement:
        float fLength           = length(tsView);
        float fParallaxLength   = sqrt(fLength * fLength - tsView.z * tsView.z) / tsView.z;

        // Compute the actual reverse parallax displacement vector:
        vec2 tsParallaxOffset = vParallaxDirection * fParallaxLength;

        // Need to scale the amount of displacement to account for different height ranges
        // in height maps. This is controlled by an artist-editable parameter:
        tsParallaxOffset *= m_ParallaxHeight;

        //===============================================//
        // Parallax occlusion mapping offset computation //
        //===============================================//

        // Utilize dynamic flow control to change the number of samples per ray 
        // depending on the viewing angle for the surface. Oblique angles require 
        // smaller step sizes to achieve more accurate precision for computing displacement.
        // We express the sampling rate as a linear function of the angle between 
        // the geometric normal and the view direction ray:
        //int nNumSteps = int(mix(float(m_PomMaxSamples), float(m_PomMinSamples), dot(wsView, wsNormal)));
        int nNumSteps = 64;

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
        float fStepSize   = 1.0 / float(nNumSteps);
        float fPrevHeight = 1.0;
        float fNextHeight = 0.0;

        int    nStepIndex = 0;
        bool   bCondition = true;

        vec2   vTexOffsetPerStep = fStepSize * tsParallaxOffset;
        vec2   vTexCurrentOffset = v_TexCoord;
        float  fCurrentBound     = 1.0;
        float  fParallaxAmount   = 0.0;

        vec2   pt1 = vec2(0.0);
        vec2   pt2 = vec2(0.0);

        vec2   texOffset2 = vec2(0.0);

        while (nStepIndex < nNumSteps)
        {
          vTexCurrentOffset -= vTexOffsetPerStep;

          // Sample height map which in this case is stored in the alpha channel of the normal map:
          //fCurrHeight = getPomHeightSample(vTexCurrentOffset);
          fCurrHeight = texture2DLod(m_ParallaxMap, vTexCurrentOffset, 1.0).r;

          fCurrentBound -= fStepSize;

          if (fCurrHeight > fCurrentBound)
          {   
            pt1 = vec2(fCurrentBound, fCurrHeight);
            pt2 = vec2(fCurrentBound + fStepSize, fPrevHeight);

            texOffset2 = vTexCurrentOffset - vTexOffsetPerStep;

            nStepIndex = nNumSteps + 1;
            fPrevHeight = fCurrHeight;
          }
          else
          {
            nStepIndex++;
            fPrevHeight = fCurrHeight;
          }
        }   

        float fDelta2 = pt2.x - pt2.y;
        float fDelta1 = pt1.x - pt1.y;

        float fDenominator = fDelta2 - fDelta1;

        // SM 3.0 requires a check for divide by zero, since that operation will generate
        // an 'Inf' number instead of 0, as previous models (conveniently) did:
        if (fDenominator == 0.0f)
        {
          fParallaxAmount = 0.0f;
        }
        else
        {
          fParallaxAmount = (pt1.x * fDelta2 - pt2.x * fDelta1) / fDenominator;
        }

        vec2 vParallaxOffset = tsParallaxOffset * (1.0 - fParallaxAmount);

        // The computed texture offset for the displaced point on the pseudo-extruded surface:
        vec2 texSampleBase = v_TexCoord - vParallaxOffset;
        pomTexCoord = texSampleBase;

        // Lerp to bump mapping only if we are in between, transition section:

        // cLODColoring = vec4(1.0, 1.0, 1.0, 1.0);
/*
        if (fMipLevel > float(g_nLODThreshold - 1))
        {
          // Lerp based on the fractional part:
          // fMipLevelFrac = modf(fMipLevel, fMipLevelInt); // needs GLSL130
          fMipLevelFrac = mod(fMipLevel, 1.0);
          fMipLevelInt = floor(fMipLevel);

          // if (g_bVisualizeLOD)
          // {
          //   // For visualizing: lerping from regular POM-resulted color through blue color for transition layer:
          //   cLODColoring = vec4(1.0, 1.0, max(1.0, 2.0 * fMipLevelFrac), 1.0);
          // }

          // Lerp the texture coordinate from parallax occlusion mapped coordinate to bump mapping
          // smoothly based on the current mip level:
          pomTexCoord = mix(texSampleBase, v_TexCoord, fMipLevelFrac);
        }
*/
      }
/*
      void addPomShadow(const in vec3 tsLight, const in vec2 pomTexCoord, inout float pomShadowSum)
      {
        vec2 vLightRayTS = tsLight.xy * m_ParallaxHeight;

        // Compute the soft blurry shadows taking into account self-occlusion for 
        // features of the height field:
        float sh0 =  getPomHeightSample(pomTexCoord);
        float shA = (getPomHeightSample(pomTexCoord + vLightRayTS * 0.88) - sh0 - 0.88) *  1.0 * m_PomShadowSoftening;
        float sh9 = (getPomHeightSample(pomTexCoord + vLightRayTS * 0.77) - sh0 - 0.77) *  2.0 * m_PomShadowSoftening;
        float sh8 = (getPomHeightSample(pomTexCoord + vLightRayTS * 0.66) - sh0 - 0.66) *  4.0 * m_PomShadowSoftening;
        float sh7 = (getPomHeightSample(pomTexCoord + vLightRayTS * 0.55) - sh0 - 0.55) *  6.0 * m_PomShadowSoftening;
        float sh6 = (getPomHeightSample(pomTexCoord + vLightRayTS * 0.44) - sh0 - 0.44) *  8.0 * m_PomShadowSoftening;
        float sh5 = (getPomHeightSample(pomTexCoord + vLightRayTS * 0.33) - sh0 - 0.33) * 10.0 * m_PomShadowSoftening;
        float sh4 = (getPomHeightSample(pomTexCoord + vLightRayTS * 0.22) - sh0 - 0.22) * 12.0 * m_PomShadowSoftening;

        // Compute the actual shadow strength:
        float fOcclusionShadow = 1.0 - max(max(max(max(max(max(shA, sh9), sh8), sh7), sh6), sh5), sh4);

        // The previous computation overbrightens the image, let's adjust for that:
        fOcclusionShadow = fOcclusionShadow * 0.4 + 0.4;
        pomShadowSum *= fOcclusionShadow;
      }

      void calculatePom(const in vec3 tsView, const in vec3 wsView, const in vec3 wsNormal, const in vec3 tsLight, out vec2 pomTexCoord, out float pomShadow)
      {
        // Start the current sample located at the input texture coordinate, which would correspond
        // to computing a bump mapping result:
        pomTexCoord = v_TexCoord;
        pomShadow = 1.0;

        // Multiplier for visualizing the level of detail (see notes for 'nLODThreshold' variable
        // for how that is done visually)
        // vec4 cLODColoring = vec4(1.0, 1.0, 3.0, 1.0);

        if (fMipLevel <= float(g_nLODThreshold))
        {
          calculatePomTexCoord(tsView, wsView, wsNormal, pomTexCoord);
          addPomShadow(tsLight, pomTexCoord, pomShadow);
        }
      }

      vec2 steepParallaxOffset(const in sampler2D parallaxMap, const in vec3 vViewDir, const in vec2 texCoord, in float parallaxScale)
      {
        vec2 vParallaxDirection = normalize(vViewDir.xy);

        // The length of this vector determines the furthest amount of displacement: (Ati's comment)
        float fLength         = length(vViewDir);
        float fParallaxLength = sqrt(fLength * fLength - vViewDir.z * vViewDir.z) / vViewDir.z; 

        // Compute the actual reverse parallax displacement vector: (Ati's comment)
        vec2 vParallaxOffsetTS = vParallaxDirection * fParallaxLength;

        // Need to scale the amount of displacement to account for different height ranges
        // in height maps. This is controlled by an artist-editable parameter: (Ati's comment)              
        parallaxScale *= 0.3;
        vParallaxOffsetTS *= parallaxScale;
        //vec2 vParallaxOffsetTS = v_tsParallaxOffset;

        vec3 eyeDir = normalize(vViewDir).xyz;   

        float nMinSamples = 6;
        float nMaxSamples = 1000 * parallaxScale;   
        //float nNumSamples = mix(nMinSamples, nMaxSamples, 1.0 - eyeDir.z);   //In reference shader: int nNumSamples = (int)(lerp( nMinSamples, nMaxSamples, dot( eyeDirWS, N ) ));
        float nNumSamples = 64.0;
        float fStepSize = 1.0 / nNumSamples;   
        float fCurrHeight = 0.0;
        float fPrevHeight = 1.0;
        float fNextHeight = 0.0;
        float nStepIndex = 0;
        vec2 vTexOffsetPerStep = fStepSize * vParallaxOffsetTS;
        vec2 vTexCurrentOffset = texCoord;
        float  fCurrentBound     = 1.0;
        float  fParallaxAmount   = 0.0;   

        while ( nStepIndex < nNumSamples && fCurrHeight <= fCurrentBound ) 
        {
          vTexCurrentOffset -= vTexOffsetPerStep;
          fPrevHeight = fCurrHeight;

          #ifdef NORMALMAP_PARALLAX
             //parallax map is stored in the alpha channel of the normal map         
             fCurrHeight = texture2DLod( parallaxMap, vTexCurrentOffset,1.0).a; 
          #else
             //parallax map is a texture
             fCurrHeight = texture2DLod( parallaxMap, vTexCurrentOffset,1.0).r;                
          #endif

          fCurrentBound -= fStepSize;
          nStepIndex+=1.0;
        }

        vec2 pt1 = vec2( fCurrentBound, fCurrHeight );
        vec2 pt2 = vec2( fCurrentBound + fStepSize, fPrevHeight );

        float fDelta2 = pt2.x - pt2.y;
        float fDelta1 = pt1.x - pt1.y;

        float fDenominator = fDelta2 - fDelta1;

        fParallaxAmount = (pt1.x * fDelta2 - pt2.x * fDelta1 ) / fDenominator;

        vec2 vParallaxOffset = vParallaxOffsetTS * (1.0 - fParallaxAmount );
        return texCoord - vParallaxOffset;  
      }
*/
    #endif
  #endif

  void initializeMaterialColors(
    #if (defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)) && defined(NORMALMAP)
      const in vec2 pomTexCoord,
    #endif
      out vec3 ambientColor, 
      out vec3 diffuseColor, 
      out vec3 specularColor, 
      out float alpha)
  {
    #if defined(MATERIAL_COLORS) && defined(AMBIENT)
      ambientColor = m_Ambient.rgb;
    #else
      ambientColor = vec3(0.2);
    #endif
    
    #if defined(MATERIAL_COLORS) && defined(DIFFUSE)
      diffuseColor = m_Diffuse.rgb;
      alpha = m_Diffuse.a;
    #else
      diffuseColor = vec3(1.0);
      alpha = 1.0;
    #endif

    #ifdef DIFFUSEMAP
      vec4 diffuseMapColor;
      #if (defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)) && defined(NORMALMAP)
        diffuseMapColor = texture2D(m_DiffuseMap, pomTexCoord);
      #else
        diffuseMapColor = texture2D(m_DiffuseMap, v_TexCoord);
      #endif

      diffuseColor *= diffuseMapColor.rgb;
      alpha *= diffuseMapColor.a;
    #endif

    #if defined(MATERIAL_COLORS) && defined(SPECULAR)
      specularColor = m_Specular.xyz;
    #else
      specularColor = vec3(0.0);
    #endif

    #ifdef SPECULARMAP
      specularColor *= texture2D(m_SpecularMap, v_TexCoord);
    #endif

    // ToDo: light map, alpha map
  }

  void calculateLightVector(const in vec4 lightPosition, const in vec4 lightColor, 
    out vec3 lightVector, out float attenuation)
  {
    // positional or directional light?
    if (lightColor.w == 0.0)
    {
      lightVector = -lightPosition.xyz;
      attenuation = 1.0;
    }
    else
    {
      lightVector = lightPosition.xyz - v_wsPosition;
      float dist = length(lightVector);
      lightVector /= vec3(dist);
      attenuation = clamp(1.0 - lightPosition.w * dist, 0.0, 1.0);
    }  
  }

  void addLight(const in vec3 N, const in vec3 L, const in vec3 E, 
    const in vec3 lightColor, const in float attenuation, 
    inout vec3 diffuseLightSum, inout vec3 specularLightSum)
  {
    diffuseLightSum += lightColor * max(dot(N, L), 0.0) * attenuation;

    vec3 R = reflect(-L, N);
    specularLightSum += lightColor * pow(max(dot(R, E), 0.0), m_Shininess) * attenuation;
  }

  void doPerFragmentLighting()
  {
    vec3 V; // view vector
    vec3 N; // normal vector
    vec3 E; // eye vector
    vec3 L; // light vector

    vec3 ambientColor;
    vec3 diffuseColor;
    vec3 specularColor;
    float alpha;
    float attenuation;

    #ifdef NORMALMAP
      vec3 wsTangent = normalize(v_wsTangent);
      vec3 wsBitangent = normalize(v_wsBitangent);
      vec3 wsNormal = normalize(v_wsNormal);
      vec3 wsView = normalize(v_wsView);

      // world space -> tangent space matrix
      mat3 wsTangentMatrix = mat3(wsTangent, wsBitangent, wsNormal);

      vec3 tsView = v_wsView * wsTangentMatrix; // world space -> tangent space
      V = normalize(tsView);
      E = -V;

      #if defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)

        // Start the current sample located at the input texture coordinate, which would correspond
        // to computing a bump mapping result:
        //vec2 pomTexCoord = v_TexCoord;
        vec2 pomTexCoord;

//        if (fMipLevel <= float(g_nLODThreshold))
//        {
//          calculatePomTexCoord(tsView, wsView, wsNormal, pomTexCoord);
//        }

        pomTexCoord = steepParallaxOffset(m_ParallaxMap, tsView, v_TexCoord, m_ParallaxHeight);

        N = normalize(texture2D(m_NormalMap, pomTexCoord).xyz * 2.0 - 1.0);
      #else
        N = normalize(texture2D(m_NormalMap, v_TexCoord).xyz * 2.0 - 1.0);
      #endif
    #else
      V = normalize(v_wsView);
      E = -V;
      N = normalize(v_wsNormal);
    #endif

    #if (defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)) && defined(NORMALMAP)
      initializeMaterialColors(pomTexCoord,
        ambientColor, diffuseColor, specularColor, alpha);
      #if defined(POM_ENABLE_SHADOWS)
        float pomShadowSum = 1.0;
      #endif
    #else
      initializeMaterialColors(
        ambientColor, diffuseColor, specularColor, alpha);
    #endif

    vec3 ambientLightSum = ambientColor * g_AmbientLightColor.rgb;
    vec3 diffuseLightSum = vec3(0.0);
    vec3 specularLightSum = vec3(0.0);

    for (int i = 0; i < NUM_LIGHTS; i++)
    {
      vec4 lightPosition = g_LightPosition[i];
      vec4 lightColor = g_LightColor[i];
      vec3 lightVector;

      calculateLightVector(lightPosition, lightColor, lightVector, attenuation);

      #ifdef NORMALMAP        
        lightVector = lightVector * wsTangentMatrix; // world space -> tangent space
      #endif

      L = normalize(lightVector);

      addLight(N, L, E, lightColor.rgb, attenuation, diffuseLightSum, specularLightSum);
      #if (defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)) && defined(NORMALMAP) && defined(POM_ENABLE_SHADOWS)
        if (fMipLevel <= float(g_nLODThreshold))
        {
          addPomShadow(lightVector, pomTexCoord, pomShadowSum);
        }
      #endif
    }

    #if (defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)) && defined(NORMALMAP) && defined(POM_ENABLE_SHADOWS)
      diffuseColor *= pomShadowSum;
    #endif

    gl_FragColor.rgb = diffuseColor * (ambientLightSum + diffuseLightSum) + specularColor * specularLightSum;
    gl_FragColor.a = alpha;
  }
#endif

void main(void)
{
  #ifdef VERTEX_LIGHTING
    textureVertexFragment();
  #else
    doPerFragmentLighting();
  #endif
}
