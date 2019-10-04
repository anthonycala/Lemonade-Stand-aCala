using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Lemonade_Stand
{
    class Recipe
    {

        //member variables (Has A)
        public int amountOfLemons;
        public int amountOfSugarCubes;
        public int amountOfIceCubes;
        public double pricePerCup;



        // Constructor
        public Recipe()
        {
            amountOfLemons = 0;
            amountOfSugarCubes = 0;
            amountOfIceCubes = 0;
            pricePerCup = 0;
        }


        // member methods


        public void SetRecipe()
        {
            Console.WriteLine("How many lemons per pitcher?");
            amountOfLemons = Console.Read(); 
            Console.WriteLine("How many sugar cubes per pitcher?");
            amountOfSugarCubes = Console.Read();
            Console.WriteLine("How many sugar cubes per pitcher?");
            amountOfSugarCubes = Console.Read();
        }
        public void SetRecipe()
        {
            
        }
     }
}

