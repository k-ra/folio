import { useEffect, useRef } from 'react'

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`
const FRAG = `
precision mediump float;
uniform vec2 r; uniform float t; uniform float dark;
void main(){
  vec2 uv = gl_FragCoord.xy / r; uv.y = 1. - uv.y;
  float n = sin(uv.x*6. + t*.4) + sin(uv.y*5. - t*.3) + sin((uv.x+uv.y)*4. + t*.5) + sin(length(uv-.5)*10. - t*.6);
  float k = (n + 4.) / 8.;
  vec3 light = vec3(200. + k*55., 205. + k*50., 215. + k*40.) / 255.;
  vec3 night = vec3(20. + k*60., 24. + k*70., 40. + k*110.) / 255.;
  gl_FragColor = vec4(mix(light, night, dark), 1.);
}`

/**
 * A slow, low-contrast field of summed sines, rendered small and upscaled
 * with a blur so it reads as paper-tinted light rather than a screensaver.
 */
export default function Shader({ dark }: { dark: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const darkRef = useRef(dark)
  darkRef.current = dark

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const W = 192
    const H = 108
    el.width = W
    el.height = H
    const gl = el.getContext('webgl', { antialias: false, alpha: false })
    if (!gl) return
    const mk = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      return sh
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const a = gl.getAttribLocation(prog, 'a')
    gl.enableVertexAttribArray(a)
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0)
    const uR = gl.getUniformLocation(prog, 'r')
    const uT = gl.getUniformLocation(prog, 't')
    const uD = gl.getUniformLocation(prog, 'dark')
    gl.viewport(0, 0, W, H)
    gl.uniform2f(uR, W, H)
    const t0 = performance.now()
    let raf = 0
    const loop = () => {
      gl.uniform1f(uT, (performance.now() - t0) / 1000)
      gl.uniform1f(uD, darkRef.current ? 1 : 0)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        filter: 'blur(28px) saturate(1.2)',
        transform: 'scale(1.1)',
      }}
    />
  )
}
