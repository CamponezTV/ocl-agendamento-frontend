import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

let socketInstance: Socket | null = null

function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    })
  }
  return socketInstance
}

export type SocketStatus = 'connecting' | 'connected' | 'disconnected'

export function useSocket() {
  const socket = getSocket()
  const [status, setStatus] = useState<SocketStatus>(
    socket.connected ? 'connected' : 'connecting'
  )

  useEffect(() => {
    const onConnect = () => setStatus('connected')
    const onDisconnect = () => setStatus('disconnected')
    const onConnectError = () => setStatus('disconnected')

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
    }
  }, [socket])

  return { socket, status }
}
