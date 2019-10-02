using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Lemonade_Stand
{
    class Inventory
    {
        //member variables (Has A)
        public List<Lemon> Lemons;
        public List<IceCubes> IceCubes;
        public List<Cups> Cups;
        public List<SugarCube> SugarCubes;




        // Constructor
        public Inventory()
        {
            Lemons = new List<Lemon>();
            IceCubes = new List<IceCubes>();
            Cups = new List<Cups>();
            SugarCubes = new List<SugarCube>();
      
        }


        

     }


       
}
