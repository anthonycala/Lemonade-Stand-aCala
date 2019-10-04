using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Lemonade_Stand
{
    class Customer
    {
        //member variables (Has A)
        private List<string> names;
        public string name;
        int lemonPref;
        int sugarPref;
        int iceCubePref;



        // Constructor
        public Customer()
        {

        }

        public bool BuyLogic(Recipe recipe)
        {
            if (lemonPref == recipe.amountOfLemons)
            {
                return true;
            }
            else if(sugarPref == recipe.amountOfSugarCubes)
            {
                return true;
            }
            else if (iceCubePref == recipe.amountOfIceCubes)
            {
                return true;
            }
        }



        // member methods
    }

}
