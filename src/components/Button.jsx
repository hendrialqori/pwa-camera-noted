
const backgroundColors = {
   blue: 'bg-blue-500',
   red: 'bg-red-500',
   green: 'bg-green-500',
   yellow: 'bg-yellow-500',
   gray: 'bg-gray-500',
   purple: 'bg-purple-500',
}

export default function Button({ children, bgColor = 'bg-black' }) {

   return (
      <button className={`${backgroundColors[bgColor] || bgColor} hover:opacity-80 text-white font-bold py-2 px-4 rounded`}>
         {children}
      </button>
   )
}