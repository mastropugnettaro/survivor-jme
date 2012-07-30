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

  uniform vec4 g_LightPosition[NUM_LIGHTS];
  uniform vec4 g_LightDirection[NUM_LIGHTS];
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
    varying vec3 v_tsView;

    #if defined(PARALLAXMAP)
      uniform sampler2D m_ParallaxMap;
    #endif

    #if defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)

      uniform vec2 g_FrustumNearFar;
      uniform float m_ParallaxHeight;

      float getHeightSample(const in vec2 texCoord)
      {
        #if defined(PARALLAXMAP)
          return texture2D(m_ParallaxMap, texCoord).r;
        #elif defined(NORMALMAP_PARALLAX)
          return texture2D(m_NormalMap, texCoord).a;
        #endif
      }

      float getFragDepth(float z)
      {
        float near = g_FrustumNearFar.x;
        float far = g_FrustumNearFar.y;
        return ((-far / (far - near) * z - far * near / (near - far)) / -z);
        //return far / (far - near) + ((far * near / (near - far)) / z);
        //return (far + near) / (far - near) + ((-2.0 * far * near / (far - near)) / z);
      }

     #ifdef STEEP_PARALLAX

        uniform int m_HeightMapSize;
        varying vec2 v_tsParallaxOffset;

        // Minimum and maximum samples / iterations when calculation POM
        const float c_ParallaxScale = PARALLAX_HEIGHT * 0.3; // steep compatibility
        const float c_PomMinSamples = 6.0;
        const float c_PomMaxSamples = 1000.0 * c_ParallaxScale;

        const int c_nLODThreshold = 4;
        const bool c_bVisualizeLOD = false;

        // Adaptive in-shader level-of-detail system implementation. Compute the 
        // current mip level explicitly in the pixel shader and use this information 
        // to transition between different levels of detail from the full effect to 
        // simple bump mapping. See the above paper for more discussion of the approach
        // and its benefits. (see: Tatarchuk-POM-SI3D06.pdf)

        // Compute the current gradients:
        vec2 tmp_fTexCoordsPerSize = v_TexCoord * float(m_HeightMapSize);

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

        int calculateNumSteps(const in vec3 wsView, const in vec3 wsNormal)
        {
          // Utilize dynamic flow control to change the number of samples per ray 
          // depending on the viewing angle for the surface. Oblique angles require 
          // smaller step sizes to achieve more accurate precision for computing displacement.
          // We express the sampling rate as a linear function of the angle between 
          // the geometric normal and the view direction ray:
          return int(mix(c_PomMinSamples, c_PomMaxSamples, dot(wsView, wsNormal)));
        }

        int calculateNumSteps(const in vec3 V)
        {
          // steep parallax method
          return int(mix(c_PomMinSamples, c_PomMaxSamples, 1.0 - V.z));
        }

        void calculatePomTexCoord(const in int nNumSteps, inout vec2 pomTexCoord)
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
          float fStepSize   = 1.0 / float(nNumSteps);
          float fPrevHeight = 1.0;

          int   nStepIndex = 0;
          bool  bCondition = true;

          vec2  vTexOffsetPerStep = fStepSize * v_tsParallaxOffset;
          vec2  vTexCurrentOffset = pomTexCoord;
          float fCurrentBound     = 1.0;
          float fParallaxAmount   = 0.0;

          vec2  pt1 = vec2(0.0);
          vec2  pt2 = vec2(0.0);

          vec2  texOffset2 = vec2(0.0);

          while (nStepIndex < nNumSteps)
          {
            vTexCurrentOffset -= vTexOffsetPerStep;

            // Sample height map which in this case is stored in the alpha channel of the normal map:
            fCurrHeight = getHeightSample(vTexCurrentOffset);

            fCurrentBound -= fStepSize;

            if (fCurrHeight > fCurrentBound)
            {   
              pt1 = vec2(fCurrentBound, fCurrHeight);
              pt2 = vec2(fCurrentBound + fStepSize, fPrevHeight);

              texOffset2 = vTexCurrentOffset - vTexOffsetPerStep;

              nStepIndex = nNumSteps + 1; // leave loop
              //fPrevHeight = fCurrHeight;
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
          if (fDenominator == 0.0)
          {
            fParallaxAmount = 0.0;
          }
          else
          {
            fParallaxAmount = (pt1.x * fDelta2 - pt2.x * fDelta1) / fDenominator;
          }

          vec2 vParallaxOffset = v_tsParallaxOffset * (1.0 - fParallaxAmount);
          gl_FragDepth = getFragDepth((gl_FragCoord.z + (1.0 - fParallaxAmount) * (1.0 + c_ParallaxScale) / v_tsView.z) / gl_FragCoord.w);

          // The computed texture offset for the displaced point on the pseudo-extruded surface:
          vec2 texSampleBase = pomTexCoord - vParallaxOffset;
          pomTexCoord = texSampleBase;

          //if (pomTexCoord.x < 0.0) discard;
          //if (pomTexCoord.x > 1.0) discard;
          //if (pomTexCoord.y < 0.0) discard;
          //if (pomTexCoord.y > 1.0) discard;	

          // Multiplier for visualizing the level of detail (see notes for 'nLODThreshold' variable
          // for how that is done visually)
          // vec4 cLODColoring = vec4(1.0, 1.0, 3.0, 1.0);

          // cLODColoring = vec4(1.0, 1.0, 1.0, 1.0);

          float  fMipLevelInt;    // mip level integer portion
          float  fMipLevelFrac;   // mip level fractional amount for blending in between levels

          // Lerp to bump mapping only if we are in between, transition section:

          if (fMipLevel > float(c_nLODThreshold - 1))
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
        }

        #ifdef PARALLAX_SHADOWS

          uniform float m_ParallaxShadowSoftening;

          void addParallaxShadow(const in vec3 tsLight, const in vec2 parallaxTexCoord, inout float parallaxShadowSum)
          {
            vec2 vLightRayTS = tsLight.xy * c_ParallaxScale;

            // Compute the soft blurry shadows taking into account self-occlusion for 
            // features of the height field:
            float sh0 =  getHeightSample(parallaxTexCoord);
            float shA = (getHeightSample(parallaxTexCoord + vLightRayTS * 0.88) - sh0 - 0.88) *  1.0 * m_ParallaxShadowSoftening;
            float sh9 = (getHeightSample(parallaxTexCoord + vLightRayTS * 0.77) - sh0 - 0.77) *  2.0 * m_ParallaxShadowSoftening;
            float sh8 = (getHeightSample(parallaxTexCoord + vLightRayTS * 0.66) - sh0 - 0.66) *  4.0 * m_ParallaxShadowSoftening;
            float sh7 = (getHeightSample(parallaxTexCoord + vLightRayTS * 0.55) - sh0 - 0.55) *  6.0 * m_ParallaxShadowSoftening;
            float sh6 = (getHeightSample(parallaxTexCoord + vLightRayTS * 0.44) - sh0 - 0.44) *  8.0 * m_ParallaxShadowSoftening;
            float sh5 = (getHeightSample(parallaxTexCoord + vLightRayTS * 0.33) - sh0 - 0.33) * 10.0 * m_ParallaxShadowSoftening;
            float sh4 = (getHeightSample(parallaxTexCoord + vLightRayTS * 0.22) - sh0 - 0.22) * 12.0 * m_ParallaxShadowSoftening;

            // Compute the actual shadow strength:
            float fOcclusionShadow = 1.0 - max(max(max(max(max(max(shA, sh9), sh8), sh7), sh6), sh5), sh4);

            // The previous computation overbrightens the image, let's adjust for that:
            fOcclusionShadow = fOcclusionShadow * 0.6 + 0.4 / float(NUM_LIGHTS+1) ;
            parallaxShadowSum += fOcclusionShadow / float(NUM_LIGHTS+1);
          }

        #endif
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
      #ifdef SPECULARMAP
        specularColor = vec3(1.0);
      #else
        specularColor = vec3(0.0);
      #endif      
    #endif

    #ifdef SPECULARMAP
      specularColor *= texture2D(m_SpecularMap, v_TexCoord);
    #endif

    // ToDo: light map, alpha map
  }

  void calculateLightVector(
    const in vec4 lightPosition, const in vec4 lightDirection, const in vec4 lightColor, 
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
      if (lightColor.w == 2.0)
      {
        vec3 spotDir = normalize(lightDirection.xyz);
        float curAngleCos = dot(-lightVector, spotDir);
        float innerAngleCos = floor(lightDirection.w) * 0.001;
        float outerAngleCos = fract(lightDirection.w);
        float innerMinusOuter = innerAngleCos - outerAngleCos;
        float spotFallOff = clamp((curAngleCos - outerAngleCos) / innerMinusOuter, 0.0, 1.0);
        attenuation *= spotFallOff;
      }
    }  
  }

  void addLight(const in vec3 N, const in vec3 L, const in vec3 V, 
    const in vec3 lightColor, const in float attenuation, 
    inout vec3 diffuseLightSum, inout vec3 specularLightSum)
  {
    diffuseLightSum += lightColor * max(dot(N, L), 0.0) * attenuation;

    vec3 R = reflect(-L, N);
    specularLightSum += lightColor * pow(max(dot(R, V), 0.0), m_Shininess) * attenuation;
  }

  void doPerFragmentLighting()
  {
    vec3 V; // view vector
    vec3 N; // normal vector
    vec3 L; // light vector

    vec3 ambientColor;
    vec3 diffuseColor;
    vec3 specularColor;
    float alpha;
    float attenuation;

    #ifdef NORMALMAP
      V = normalize(v_tsView);
      vec3 wsTangent = normalize(v_wsTangent);
      vec3 wsBitangent = normalize(v_wsBitangent);
      vec3 wsNormal = normalize(v_wsNormal);
      vec3 wsView = normalize(v_wsView);

      // world space -> tangent space matrix
      mat3 wsTangentMatrix = mat3(wsTangent, wsBitangent, wsNormal);

      #if defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)
        // Start the current sample located at the input texture coordinate, which would correspond
        // to computing a bump mapping result:
        vec2 parallaxTexCoord = v_TexCoord;

        #ifdef STEEP_PARALLAX
          if (fMipLevel <= float(c_nLODThreshold))
          {
            int nNumSteps = calculateNumSteps(V);
            calculatePomTexCoord(nNumSteps, parallaxTexCoord);
          }
        #else
          calculateParallaxTexCoord(V, parallaxTexCoord);
        #endif

        N = normalize(texture2D(m_NormalMap, parallaxTexCoord).xyz * 2.0 - 1.0);
      #else
        N = normalize(texture2D(m_NormalMap, v_TexCoord).xyz * 2.0 - 1.0);
      #endif
    #else
      V = normalize(v_wsView);
      N = normalize(v_wsNormal);
    #endif

    #if (defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)) && defined(NORMALMAP)
      initializeMaterialColors(parallaxTexCoord,
        ambientColor, diffuseColor, specularColor, alpha);
      #if defined(PARALLAX_SHADOWS)
        float parallaxShadowSum = 0.0;
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
      vec4 lightDirection = g_LightDirection[i];
      vec4 lightColor = g_LightColor[i];
      vec3 lightVector;

      calculateLightVector(lightPosition, lightDirection, lightColor, lightVector, attenuation);

      #ifdef NORMALMAP        
        lightVector = lightVector * wsTangentMatrix; // world space -> tangent space
      #endif

      L = normalize(lightVector);

      addLight(N, L, V, lightColor.rgb, attenuation, diffuseLightSum, specularLightSum);
      #if (defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)) && defined(NORMALMAP) && defined(PARALLAX_SHADOWS)
        if (fMipLevel <= float(c_nLODThreshold))
        {
          addParallaxShadow(lightVector, parallaxTexCoord, parallaxShadowSum);
        }
        else
        {
          parallaxShadowSum = 1.0;
        }
      #endif
    }

    #if (defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)) && defined(NORMALMAP) && defined(PARALLAX_SHADOWS)
      diffuseColor *= clamp(parallaxShadowSum, 0.0, 1.0);
      //diffuseColor *= parallaxShadowSum;
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
